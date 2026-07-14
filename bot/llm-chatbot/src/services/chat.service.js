'use strict';

const LlmService = require('./llm.service');
const PromptService = require('./prompt.service');
const ChatModel = require('../models/chat.model');
const { getMongoClient } = require('../config/mongodb');
const logger = require('../shared/logger');

// In-memory cache for fast repeat responses (TTL: 5 mins, bounded size)
const chatCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

function getCachedAnswer(question) {
  const normalized = question.trim().toLowerCase();
  const cached = chatCache.get(normalized);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.answer;
  }
  return null;
}

function setCachedAnswer(question, answer) {
  const normalized = question.trim().toLowerCase();
  if (chatCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = chatCache.keys().next().value;
    chatCache.delete(oldestKey);
  }
  chatCache.set(normalized, { answer, timestamp: Date.now() });
}

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

    // 0. Cache Lookup
    const cachedAnswer = getCachedAnswer(question);
    if (cachedAnswer) {
      logger.info('Serving answer from in-memory cache', {
        question,
        durationMs: Date.now() - startTime,
        cached: true
      });
      return { answer: cachedAnswer };
    }

    // 1. Concurrent API Operations (Classification & Embedding Generation)
    // Runs both API requests in parallel to shave off ~300-500ms latency.
    const [classification, vector] = await Promise.all([
      LlmService.classifyQuestion(question),
      LlmService.generateEmbedding(question).catch(err => {
        logger.error('Failed to generate embedding in parallel', { error: err.message });
        return null;
      })
    ]);

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
    if ((source === 'vector' || source === 'both') && vector) {
      try {
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

    // Cache the generated answer
    setCachedAnswer(question, answer);

    logger.info('Chat response generated', {
      durationMs: Date.now() - startTime,
      source,
      event: resolvedEventName,
      mongoContextLength: mongoContext.length,
      rulebookContextLength: rulebookContext.length,
      cached: false
    });

    return { answer };
  }
}

module.exports = ChatService;
