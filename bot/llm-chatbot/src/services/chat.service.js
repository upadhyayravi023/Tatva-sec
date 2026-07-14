'use strict';

const LlmService = require('./llm.service');
const PromptService = require('./prompt.service');
const ChatModel = require('../models/chat.model');
const { getMongoClient } = require('../config/mongodb');
const logger = require('../shared/logger');

class ChatService {
  /**
   * Orchestrates the full Retrieval-Augmented Generation (RAG) flow for a user question.
   *
   * @param {string} question
   * @returns {Promise<{ answer: string }>}
   */
  static async processChat(question) {
    const startTime = Date.now();
    logger.info('Processing chat question', { question });

    // 1. Classification
    const classification = await LlmService.classifyQuestion(question);
    const { source, event } = classification;

    let resolvedEventName = event;

    // Resolve canonical event name
    if (event) {
      try {
        const client = await getMongoClient();
        const db = client.db('test');
        const matchedEvent = await db.collection('events').findOne({
          isActive: true,
          $or: [
            { event: { $regex: event, $options: 'i' } },
            { sport: { $regex: event, $options: 'i' } }
          ]
        });

        if (matchedEvent) {
          resolvedEventName = matchedEvent.type === 'Cultural Event' ? matchedEvent.event : matchedEvent.sport;
          logger.debug('Resolved colloquial event name to canonical name', { event, resolvedEventName });
        }
      } catch (err) {
        logger.error('Failed to resolve canonical event name', { error: err.message });
      }
    }

    let mongoContext = '';
    let rulebookContext = '';

    // 2. Structured MongoDB Data
    if (source === 'structured' || source === 'both') {
      try {
        mongoContext = await ChatModel.getStructuredContext({
          ...classification,
          event: resolvedEventName
        });
      } catch (err) {
        logger.error('Failed to get MongoDB structured context', { error: err.message });
      }
    }

    // 3. Vector Search Context
    if (source === 'vector' || source === 'both') {
      try {
        const vector = await LlmService.generateEmbedding(question);
        let chunks = [];

        if (resolvedEventName) {
          logger.info('Attempting vector search with event filter', { eventFilter: resolvedEventName });
          chunks = await ChatModel.vectorSearch(vector, resolvedEventName);
        }

        if (!chunks || chunks.length === 0) {
          logger.info('Performing global vector search fallback');
          chunks = await ChatModel.vectorSearch(vector, null);
        }

        if (chunks && chunks.length > 0) {
          rulebookContext = chunks.map(c => {
            const sectionHeader = c.section ? ` [Section: ${c.section}]` : '';
            return `Event: ${c.event}${sectionHeader} (Page ${c.pageNumber}):\n${c.text}`;
          }).join('\n\n');
        }
      } catch (err) {
        logger.error('Failed to get vector search context', { error: err.message });
      }
    }

    // 4. Construct Prompt
    const { systemInstruction, userPrompt } = PromptService.buildPrompt(question, mongoContext, rulebookContext);

    // 5. Generate Answer
    const answer = await LlmService.getChatResponse(systemInstruction, userPrompt);

    logger.info('Chat response generated', {
      durationMs: Date.now() - startTime,
      source,
      event: resolvedEventName,
      mongoContextLength: mongoContext.length,
      rulebookContextLength: rulebookContext.length
    });

    return { answer };
  }
}

module.exports = ChatService;
