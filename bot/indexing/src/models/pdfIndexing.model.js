'use strict';

const { getPdfEmbeddingsCollection } = require('../config/mongodb');
const { VectorStoreError } = require('../shared/errors');
const logger = require('../shared/logger');

async function deleteByEvent(event, jobId = 'unknown') {
  try {
    const collection = await getPdfEmbeddingsCollection();
    const result = await collection.deleteMany({ event });

    logger.info('Deleted stale embedding documents', {
      model: 'PdfIndexing',
      jobId,
      event,
      deletedCount: result.deletedCount,
    });

    return result.deletedCount;
  } catch (err) {
    throw new VectorStoreError(
      `deleteByEvent failed for event "${event}": ${err.message}`,
      err
    );
  }
}

async function bulkInsert(documents, jobId = 'unknown') {
  if (!documents.length) {
    logger.warn('bulkInsert called with 0 documents — skipping', {
      model: 'PdfIndexing',
      jobId,
    });
    return 0;
  }

  try {
    const collection = await getPdfEmbeddingsCollection();
    const result = await collection.insertMany(documents, { ordered: false });

    logger.info('Embedding documents inserted into MongoDB Atlas', {
      model: 'PdfIndexing',
      jobId,
      insertedCount: result.insertedCount,
      totalDocuments: documents.length,
    });

    return result.insertedCount;
  } catch (err) {
    throw new VectorStoreError(
      `bulkInsert failed: ${err.message}`,
      err
    );
  }
}

async function findByEvent(event, { limit = 10 } = {}) {
  try {
    const collection = await getPdfEmbeddingsCollection();
    return collection
      .find({ event }, { projection: { embedding: 0 } })
      .limit(limit)
      .toArray();
  } catch (err) {
    throw new VectorStoreError(
      `findByEvent failed for event "${event}": ${err.message}`,
      err
    );
  }
}

module.exports = { deleteByEvent, bulkInsert, findByEvent };
