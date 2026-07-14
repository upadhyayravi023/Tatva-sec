'use strict';

const { Redis } = require('ioredis');
const env = require('./env');
const logger = require('../shared/logger');

/** @type {Redis | null} */
let _workerConnection = null;

/** @type {Redis | null} */
let _queueConnection = null;

/**
 * Builds IORedis options.
 * Auto-detects Upstash TLS from the `rediss://` URL scheme.
 * Also disables `enableOfflineQueue` to prevent memory build-up if Redis is unreachable.
 *
 * @param {string} name - Human-readable label for logging
 * @returns {import('ioredis').RedisOptions}
 */
function buildRedisOptions(name) {
  const isTls = env.REDIS_URL.startsWith('rediss://');

  return {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
    enableOfflineQueue: false,
    connectionName: name,
    // Upstash requires TLS — auto-enabled when URL scheme is rediss://
    ...(isTls && { tls: {} }),
  };
}

/**
 * Returns a dedicated Redis connection for BullMQ Workers.
 * BullMQ workers REQUIRE maxRetriesPerRequest: null.
 */
function getWorkerRedis() {
  if (!_workerConnection) {
    _workerConnection = new Redis(env.REDIS_URL, buildRedisOptions('bullmq-worker'));

    _workerConnection.on('connect', () =>
      logger.info('Redis worker connection established (Upstash)', { feature: 'redis' })
    );
    _workerConnection.on('error', (err) =>
      logger.error('Redis worker connection error', { feature: 'redis', error: err.message })
    );
  }
  return _workerConnection;
}

/**
 * Returns a dedicated Redis connection for BullMQ Queues / QueueEvents.
 */
function getQueueRedis() {
  if (!_queueConnection) {
    _queueConnection = new Redis(env.REDIS_URL, buildRedisOptions('bullmq-queue'));

    _queueConnection.on('connect', () =>
      logger.info('Redis queue connection established (Upstash)', { feature: 'redis' })
    );
    _queueConnection.on('error', (err) =>
      logger.error('Redis queue connection error', { feature: 'redis', error: err.message })
    );
  }
  return _queueConnection;
}

/**
 * Gracefully closes all open Redis connections.
 */
async function closeRedisConnections() {
  const closers = [];
  if (_workerConnection) closers.push(_workerConnection.quit());
  if (_queueConnection) closers.push(_queueConnection.quit());
  await Promise.allSettled(closers);
  _workerConnection = null;
  _queueConnection = null;
  logger.info('Redis connections closed', { feature: 'redis' });
}

module.exports = { getWorkerRedis, getQueueRedis, closeRedisConnections };
