'use strict';

const ChatService = require('../services/chat.service');
const logger = require('../shared/logger');

async function handleChat(req, res) {
  const { question } = req.body;

  try {
    const result = await ChatService.processChat(question);
    res.status(200).json(result);
  } catch (err) {
    logger.error('Error occurred in handleChat controller', {
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  }
}

module.exports = { handleChat };
