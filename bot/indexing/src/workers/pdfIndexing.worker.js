'use strict';

const { Worker } = require('bullmq');
const { getWorkerRedis } = require('../config/redis');
const { handleIndexPdfJob } = require('../controllers/pdfIndexing.controller');
const env = require('../config/env');
const logger = require('../shared/logger');

function createPdfIndexingWorker() {
  const worker = new Worker(
    env.PDF_QUEUE_NAME,
    handleIndexPdfJob,
    {
      connection: getWorkerRedis(),
      concurrency: env.WORKER_CONCURRENCY,
      stalledInterval: 30_000,
      maxStalledCount: 2,
    }
  );

  worker.on('active', (job) => {
    logger.info('Job started', {
      worker: 'PdfIndexing',
      jobId: job.id,
      event: job.data.event,
      attempt: job.attemptsMade + 1,
    });
  });

  worker.on('progress', (job, progress) => {
    logger.debug('Job progress', {
      worker: 'PdfIndexing',
      jobId: job.id,
      progress: `${progress}%`,
    });
  });

  worker.on('completed', (job, result) => {
    logger.info('Job completed ✅', {
      worker: 'PdfIndexing',
      jobId: job.id,
      event: result.event,
      totalPages: result.totalPages,
      totalChunks: result.totalChunks,
      embeddingsStored: result.embeddingsStored,
      durationMs: result.durationMs,
    });
  });

  worker.on('failed', (job, err) => {
    const isLastAttempt = job && job.attemptsMade >= (job.opts.attempts || 1);
    const level = isLastAttempt ? 'error' : 'warn';

    logger[level]('Job failed', {
      worker: 'PdfIndexing',
      jobId: job?.id,
      event: job?.data?.event,
      errorCode: err.code || 'UNKNOWN',
      errorMessage: err.message,
      attempt: job?.attemptsMade,
      maxAttempts: job?.opts?.attempts,
      willRetry: !isLastAttempt,
      stack: isLastAttempt ? err.stack : undefined,
    });
  });

  worker.on('stalled', (jobId) => {
    logger.warn('Job stalled — will be re-queued', { worker: 'PdfIndexing', jobId });
  });

  worker.on('error', (err) => {
    logger.error('Worker-level error', {
      worker: 'PdfIndexing',
      error: err.message,
      stack: err.stack,
    });
  });

  logger.info(`Worker started — listening on "${env.PDF_QUEUE_NAME}"`, {
    worker: 'PdfIndexing',
    concurrency: env.WORKER_CONCURRENCY,
  });

  return worker;
}

module.exports = { createPdfIndexingWorker };
