'use strict';

const { Queue } = require('bullmq');
const { getQueueRedis } = require('../config/redis');
const env = require('../config/env');
const logger = require('../shared/logger');

const pdfIndexingQueue = new Queue(env.PDF_QUEUE_NAME, {
  connection: getQueueRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

pdfIndexingQueue.on('error', (err) => {
  logger.error('Queue error', { queue: env.PDF_QUEUE_NAME, error: err.message });
});

logger.info(`Queue "${env.PDF_QUEUE_NAME}" initialised`, { queue: env.PDF_QUEUE_NAME });

async function enqueueIndexingJob(payload, opts = {}) {
  const job = await pdfIndexingQueue.add('index-pdf', payload, opts);
  logger.info('Job enqueued', {
    queue: env.PDF_QUEUE_NAME,
    jobId: job.id,
    event: payload.event,
  });
  return job;
}

module.exports = { pdfIndexingQueue, enqueueIndexingJob };
