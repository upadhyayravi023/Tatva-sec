'use strict';

// Load and validate env before anything else
const env = require('./config/env');
const logger = require('./shared/logger');

const { createPdfIndexingWorker } = require('./workers/pdfIndexing.worker');
const { closeRedisConnections } = require('./config/redis');
const { closeMongoConnection } = require('./config/mongodb');

// ─── Startup Banner ───────────────────────────────────────────────────────────

logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
logger.info('  📄 PDF Indexing Worker — Starting up');
logger.info(`  Queue : ${env.PDF_QUEUE_NAME}`);
logger.info(`  Model : ${env.EMBEDDING_MODEL} (${env.EMBEDDING_DIMENSIONS} dims)`);
logger.info(`  Concurrency : ${env.WORKER_CONCURRENCY}`);
logger.info(`  Env   : ${env.NODE_ENV}`);
logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ─── Start Worker ─────────────────────────────────────────────────────────────

const worker = createPdfIndexingWorker();

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal} — shutting down worker gracefully...`, {
    feature: 'worker-main',
  });

  try {
    await worker.close();
    logger.info('BullMQ worker closed', { feature: 'worker-main' });

    await closeRedisConnections();
    await closeMongoConnection();

    logger.info('Shutdown complete. Goodbye. 👋', { feature: 'worker-main' });
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', {
      feature: 'worker-main',
      error: err.message,
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Uncaught Exception Guard ─────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — process will exit', {
    feature: 'worker-main',
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection — process will exit', {
    feature: 'worker-main',
    reason: String(reason),
  });
  process.exit(1);
});
