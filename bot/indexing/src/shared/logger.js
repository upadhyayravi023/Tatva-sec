'use strict';

const { createLogger, format, transports } = require('winston');
const env = require('../config/env');

const { combine, timestamp, printf, colorize, errors } = format;

// ─── Dev format (human-readable) ─────────────────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, feature, jobId, stack, ...meta }) => {
    const featureTag = feature ? `[${feature}]` : '';
    const jobTag = jobId ? `[job:${jobId}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} ${level} ${featureTag}${jobTag} ${message}${metaStr}${stackStr}`;
  })
);

// ─── Prod format (JSON for log aggregators) ───────────────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'pdf-indexing-worker' },
  transports: [
    new transports.Console(),
  ],
});

module.exports = logger;
