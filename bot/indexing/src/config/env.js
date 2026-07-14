'use strict';

require('dotenv').config();

const REQUIRED = [
  'REDIS_URL',
  'MONGODB_URI',
  'GEMINI_API_KEY',
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[env] FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  // Redis
  REDIS_URL: process.env.REDIS_URL,

  // MongoDB Atlas
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'embeddings',
  MONGODB_COLLECTION: process.env.MONGODB_COLLECTION || 'pdf_embeddings',

  // Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
  EMBEDDING_DIMENSIONS: parseInt(process.env.EMBEDDING_DIMENSIONS || '3072', 10),

  // BullMQ
  PDF_QUEUE_NAME: process.env.PDF_QUEUE_NAME || 'pdf-indexing-queue',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),

  // Text chunking
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE || '400', 10),
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP || '40', 10),

  PORT: parseInt(process.env.PORT || '10000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};
