'use strict';

/**
 * Middleware to validate chat request payload.
 */
function validateChatRequest(req, res, next) {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Field "question" is required and must be a non-empty string.',
    });
  }

  next();
}

module.exports = validateChatRequest;
