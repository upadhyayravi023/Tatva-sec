'use strict';

const { MongoClient } = require('mongodb');
const env = require('./env');
const logger = require('../shared/logger');

/** @type {MongoClient | null} */
let _client = null;

/**
 * Returns the MongoClient singleton, connecting on first call.
 * @returns {Promise<MongoClient>}
 */
async function getMongoClient() {
  if (_client) return _client;

  _client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 60_000,
    socketTimeoutMS: 120_000,
    connectTimeoutMS: 60_000,
  });

  await _client.connect();
  logger.info('MongoDB Atlas connected', {
    feature: 'mongodb',
    db: env.MONGODB_DB_NAME,
    collection: env.MONGODB_COLLECTION,
  });

  return _client;
}

/**
 * Returns the target MongoDB collection for vector embeddings.
 * @returns {Promise<import('mongodb').Collection>}
 */
async function getPdfEmbeddingsCollection() {
  const client = await getMongoClient();
  return client.db(env.MONGODB_DB_NAME).collection(env.MONGODB_COLLECTION);
}

/**
 * Gracefully closes the MongoDB connection.
 */
async function closeMongoConnection() {
  if (_client) {
    await _client.close();
    _client = null;
    logger.info('MongoDB connection closed', { feature: 'mongodb' });
  }
}

module.exports = { getMongoClient, getPdfEmbeddingsCollection, closeMongoConnection };
