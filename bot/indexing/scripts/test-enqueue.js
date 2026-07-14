'use strict';

require('dotenv').config();

const { enqueueIndexingJob } = require('../src/queues/pdfIndexing.queue');
const { closeRedisConnections } = require('../src/config/redis');
const logger = require('../src/shared/logger');

const testPayload = {
  event: 'Badminton Doubles',
  driveLink: 'https://drive.google.com/file/d/1jl7u6QbIoQ9H1DdlatrSw71zhg-R5lhT/view?usp=drive_link',
  uploadedBy: 'test-script',
  version: 1,
};

async function main() {
  logger.info('Enqueueing test PDF indexing job', { payload: testPayload });

  try {
    const job = await enqueueIndexingJob(testPayload, {
      attempts: 1,
    });

    logger.info('Test job enqueued successfully!', {
      jobId: job.id,
      queueName: job.queueName,
    });
  } catch (err) {
    logger.error('Failed to enqueue test job', { error: err.message });
  } finally {
    await new Promise((r) => setTimeout(r, 500));
    await closeRedisConnections();
    process.exit(0);
  }
}

main();
