'use strict';

require('dotenv').config();

const REQUIRED = [
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
  // MongoDB Atlas
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'embeddings',
  MONGODB_COLLECTION: process.env.MONGODB_COLLECTION || 'pdf_embeddings',

  // Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
  EMBEDDING_DIMENSIONS: parseInt(process.env.EMBEDDING_DIMENSIONS || '3072', 10),
  CHAT_MODEL: process.env.CHAT_MODEL || 'gemini-2.5-flash',

  // Server
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};
