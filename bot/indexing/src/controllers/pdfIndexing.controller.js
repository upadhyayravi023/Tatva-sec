'use strict';

const PdfIndexingService = require('../services/pdfIndexing.service');
const { InvalidJobPayloadError } = require('../shared/errors');
const logger = require('../shared/logger');

const PAYLOAD_SCHEMA = [
  { field: 'event', type: 'string' },
  {
    field: 'driveLink',
    type: 'string',
    validator: (v) => v.includes('drive.google.com'),
  },
  { field: 'version', type: 'number' },
];

function validatePayload(data) {
  if (!data || typeof data !== 'object') {
    throw new InvalidJobPayloadError('Job payload must be a non-null object');
  }

  for (const { field, type, validator } of PAYLOAD_SCHEMA) {
    const value = data[field];

    if (value === undefined || value === null || typeof value !== type) {
      throw new InvalidJobPayloadError(
        `Payload field "${field}" is required and must be type ${type}. ` +
        `Received: ${JSON.stringify(value)}`
      );
    }

    if (validator && !validator(value)) {
      throw new InvalidJobPayloadError(
        `Payload field "${field}" failed validation. Value: ${JSON.stringify(value)}`
      );
    }
  }

  return data;
}

async function handleIndexPdfJob(job) {
  const jobId = String(job.id);

  logger.info('Job received', {
    controller: 'PdfIndexing',
    jobId,
    attempt: job.attemptsMade + 1,
  });

  const payload = validatePayload(job.data);

  logger.info('Payload valid — delegating to service', {
    controller: 'PdfIndexing',
    jobId,
    event: payload.event,
    version: payload.version,
  });

  const onProgress = (percent) => job.updateProgress(percent);
  const result = await PdfIndexingService.indexPdf(payload, onProgress, jobId);

  logger.info('Job complete', { controller: 'PdfIndexing', jobId, ...result });
  return result;
}

module.exports = { handleIndexPdfJob, validatePayload };
