'use strict';

// Load and validate env before anything else
const env = require('./config/env');
const logger = require('./shared/logger');

const express = require('express');
const path = require('path');
const { closeMongoConnection } = require('./config/mongodb');

// ─── Startup Banner ───────────────────────────────────────────────────────────

logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
logger.info('  🤖 LLM Chat Service — Starting up');
logger.info(`  Model : ${env.CHAT_MODEL}`);
logger.info(`  Env   : ${env.NODE_ENV}`);
logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ─── Express Server ───────────────────────────────────────────────────────────

const app = express();

// Parse JSON request bodies
app.use(express.json());

// CORS Middleware to allow external requests (e.g. from Admin Dashboard)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

const { handleChat } = require('./controllers/chat.controller');
const validateChatRequest = require('./middlewares/validateChat');

// Chatbot Endpoint with middleware
app.post('/api/chat', validateChatRequest, handleChat);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'llm-chat-service',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(env.PORT, () => {
  logger.info(`LLM Chat Service listening on port ${env.PORT}`, {
    feature: 'chat-server',
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

  logger.info(`Received ${signal} — shutting down chat server gracefully...`, {
    feature: 'chat-server',
  });

  try {
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed', { feature: 'chat-server' });

    await closeMongoConnection();

    logger.info('Shutdown complete. Goodbye. 👋', { feature: 'chat-server' });
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', {
      feature: 'chat-server',
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
    feature: 'chat-server',
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection — process will exit', {
    feature: 'chat-server',
    reason: String(reason),
  });
  process.exit(1);
});
