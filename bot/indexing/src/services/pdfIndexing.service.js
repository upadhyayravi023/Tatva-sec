'use strict';

const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

const { downloadPdfFromDrive } = require('../utils/drive-downloader');
const { chunkPdfPages } = require('../utils/text-chunker');
const PdfIndexingModel = require('../models/pdfIndexing.model');
const env = require('../config/env');
const logger = require('../shared/logger');
const { PdfParseError, EmbeddingError } = require('../shared/errors');

const EMBEDDING_BATCH_SIZE = 100;
const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

async function downloadAndParsePages(driveLink, jobId) {
  logger.info('Downloading PDF', { service: 'PdfIndexing', jobId, driveLink });
  const pdfBuffer = await downloadPdfFromDrive(driveLink, jobId);

  logger.info('Parsing PDF text page-by-page', {
    service: 'PdfIndexing',
    jobId,
    sizeBytes: pdfBuffer.length,
  });

  const pageTexts = [];

  async function pageRenderer(pageData) {
    const textContent = await pageData.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    pageTexts.push(pageText);
    return pageText;
  }

  try {
    await pdfParse(pdfBuffer, { pagerender: pageRenderer });
  } catch (err) {
    throw new PdfParseError(`Failed to parse PDF buffer: ${err.message}`, err);
  }

  logger.info('PDF parsed', {
    service: 'PdfIndexing',
    jobId,
    totalPages: pageTexts.length,
    nonBlank: pageTexts.filter((t) => t.length > 0).length,
  });

  return pageTexts;
}

async function generateEmbeddings(texts, jobId) {
  const allEmbeddings = [];
  const totalBatches = Math.ceil(texts.length / EMBEDDING_BATCH_SIZE);

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;

    logger.debug(`Embedding batch ${batchNum}/${totalBatches}`, {
      service: 'PdfIndexing',
      jobId,
      batchSize: batch.length,
    });

    for (const text of batch) {
      try {
        const result = await genai.models.embedContent({
          model: env.EMBEDDING_MODEL,
          contents: text,
        });

        const values = result?.embeddings?.[0]?.values;
        if (!Array.isArray(values) || values.length === 0) {
          throw new Error('Gemini returned an empty embedding vector');
        }

        allEmbeddings.push(values);
      } catch (err) {
        throw new EmbeddingError(
          `Gemini embeddings API failed on batch ${batchNum}: ${err.message}`,
          err
        );
      }
    }
  }

  logger.info('Embeddings generated', {
    service: 'PdfIndexing',
    jobId,
    count: allEmbeddings.length,
  });

  return allEmbeddings;
}

function buildDocument(chunk, embedding, payload) {
  return {
    text: chunk.text,
    embedding,
    event: payload.event,
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
    section: chunk.section,
    version: payload.version,
    createdAt: new Date(),
    metadata: {
      driveLink: payload.driveLink,
      uploadedBy: payload.uploadedBy || 'unknown',
    },
  };
}

async function indexPdf(payload, onProgress, jobId) {
  const startTime = Date.now();

  await onProgress(10);
  const pageTexts = await downloadAndParsePages(payload.driveLink, jobId);

  if (!pageTexts.length) {
    throw new Error('PDF is empty or contains no extractable text');
  }

  await onProgress(30);
  const chunks = chunkPdfPages(pageTexts);
  logger.info('Text chunked', { service: 'PdfIndexing', jobId, totalChunks: chunks.length });

  if (!chunks.length) {
    throw new Error('Chunking produced 0 results — PDF may contain only images or scans');
  }

  await onProgress(45);
  const deletedCount = await PdfIndexingModel.deleteByEvent(payload.event, jobId);
  logger.info('Stale embeddings removed', { service: 'PdfIndexing', jobId, deletedCount });

  await onProgress(55);
  const embeddings = await generateEmbeddings(chunks.map((c) => c.text), jobId);

  if (embeddings.length !== chunks.length) {
    throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`);
  }

  await onProgress(80);
  const documents = chunks.map((chunk, i) => buildDocument(chunk, embeddings[i], payload));
  const insertedCount = await PdfIndexingModel.bulkInsert(documents, jobId);

  await onProgress(100);

  return {
    event: payload.event,
    totalPages: pageTexts.length,
    totalChunks: chunks.length,
    embeddingsStored: insertedCount,
    durationMs: Date.now() - startTime,
  };
}

module.exports = { indexPdf, generateEmbeddings, downloadAndParsePages };
