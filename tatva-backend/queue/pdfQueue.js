const { Queue } = require('bullmq');
const { Redis } = require('ioredis');

const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: {},
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

const pdfQueue = new Queue('pdf-indexing-queue', {
  connection: redisConnection,
});

module.exports = { pdfQueue };
