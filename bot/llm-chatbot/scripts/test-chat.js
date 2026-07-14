'use strict';

require('dotenv').config();

const ChatService = require('../src/services/chat.service');
const { closeMongoConnection } = require('../src/config/mongodb');
const logger = require('../src/shared/logger');

const testQuestions = [
  'What is the team size for Tug of War?',
  'What events are happening in the college fest?',
  'Who is the winner of the chess tournament?'
];

async function main() {
  for (const question of testQuestions) {
    logger.info('================================================');
    logger.info(`Question: ${question}`);
    try {
      const response = await ChatService.processChat(question);
      logger.info(`Answer: ${response.answer}`);
    } catch (err) {
      logger.error('Failed to get answer', { error: err.message });
    }
  }

  await closeMongoConnection();
  process.exit(0);
}

main();
