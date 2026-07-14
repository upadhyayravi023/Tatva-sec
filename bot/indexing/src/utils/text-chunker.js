'use strict';

const env = require('../config/env');

function isHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 2) return false;

  if (trimmed === trimmed.toUpperCase() && /[A-Z]{2,}/.test(trimmed)) return true;

  if (/^(\d+\.(\d+\.?)*|Section\s+\d+|Article\s+[IVXLivxl\d]+|Chapter\s+\d+)/i.test(trimmed)) return true;

  const words = trimmed.split(/\s+/);
  const titleCaseWords = words.filter(
    (w) => /^[A-Z][a-z]/.test(w) || /^(a|an|the|and|or|of|in|to|for|on|at|by)$/i.test(w)
  );
  if (titleCaseWords.length >= Math.ceil(words.length * 0.7) && !/[.!?]$/.test(trimmed)) {
    return true;
  }

  return false;
}

function detectCurrentSection(lines) {
  let section = 'General';
  for (const line of lines) {
    if (isHeading(line)) {
      section = line.trim().replace(/[:.]$/, '').trim();
    }
  }
  return section;
}

function splitIntoWordChunks(text, chunkSize, overlap) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];

  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    chunks.push(words.slice(i, end).join(' '));
    if (end === words.length) break;
    i += chunkSize - overlap;
  }

  return chunks;
}

function chunkPdfPages(pageTexts) {
  const chunkSize = env.CHUNK_SIZE;
  const overlap = env.CHUNK_OVERLAP;

  const allChunks = [];
  let globalChunkIndex = 0;

  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    const pageNumber = pageIdx + 1;
    const pageText = (pageTexts[pageIdx] || '').trim();

    if (!pageText) continue;

    const lines = pageText.split('\n');
    const section = detectCurrentSection(lines);

    const chunks = splitIntoWordChunks(pageText, chunkSize, overlap);

    for (const chunkText of chunks) {
      if (!chunkText.trim()) continue;

      allChunks.push({
        text: chunkText.trim(),
        chunkIndex: globalChunkIndex,
        pageNumber,
        section,
      });
      globalChunkIndex++;
    }
  }

  return allChunks;
}

module.exports = { chunkPdfPages, isHeading, detectCurrentSection };
