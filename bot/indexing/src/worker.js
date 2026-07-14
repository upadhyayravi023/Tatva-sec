'use strict';

// Load and validate env before anything else
const env = require('./config/env');
const logger = require('./shared/logger');

const http = require('http');
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

// ─── Start HTTP Health Server (For Render Web Service Tier) ────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'pdf-indexing-worker-web',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(env.PORT, () => {
  logger.info(`HTTP health check server listening on port ${env.PORT}`, {
    feature: 'worker-main',
  });
});

// ─── Self-Pinging Keep-Alive Mechanism ────────────────────────────────────────

function startSelfPing(url, intervalMs = 600000) {
  if (!url) return;
  logger.info(`Starting self-ping service targeting ${url} every 10 minutes`, {
    feature: 'self-ping',
  });
  setInterval(() => {
    const client = url.startsWith('https') ? require('https') : require('http');
    client.get(url, (res) => {
      logger.debug(`Self-ping response: ${res.statusCode}`, { feature: 'self-ping' });
    }).on('error', (err) => {
      logger.error('Self-ping failed', { feature: 'self-ping', error: err.message });
    });
  }, intervalMs);
}

if (process.env.SELF_PING_URL) {
  startSelfPing(process.env.SELF_PING_URL);
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal} — shutting down worker gracefully...`, {
    feature: 'worker-main',
  });

  try {
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP health server closed', { feature: 'worker-main' });

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
