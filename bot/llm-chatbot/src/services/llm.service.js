'use strict';

const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');
const logger = require('../shared/logger');

const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

class LlmService {
  /**
   * Communicates with the LLM to generate text answers.
   *
   * @param {string} systemInstruction - The system instructions
   * @param {string} prompt            - The user prompt containing context & query
   * @returns {Promise<string>} Generated response
   */
  static async getChatResponse(systemInstruction, prompt) {
    const response = await genai.models.generateContent({
      model: env.CHAT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
      }
    });

    return response.text?.trim() || "I couldn't find this information in the available data.";
  }

  /**
   * Generates a float vector embedding using the configured model.
   *
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  static async generateEmbedding(text) {
    logger.debug('Generating query embedding for vector search', { model: env.EMBEDDING_MODEL });
    const result = await genai.models.embedContent({
      model: env.EMBEDDING_MODEL,
      contents: text,
    });

    const vector = result?.embeddings?.[0]?.values;
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Embeddings API returned empty vector');
    }
    return vector;
  }

  /**
   * Classifies a user question to identify relevant tables, event name, timeline, scores.
   *
   * @param {string} question
   * @returns {Promise<object>}
   */
  static async classifyQuestion(question) {
    const prompt = `Classify this user question: "${question}"`;
    try {
      const response = await genai.models.generateContent({
        model: env.CHAT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: `You are a classification assistant for a College Fest chatbot.
Analyze the user's question and return a JSON object with the following fields:
{
  "source": "structured" | "vector" | "both",
  "event": string | null,
  "collections": Array<"events" | "announcements" | "sports">,
  "isTimeline": boolean,
  "isLiveScore": boolean
}

Rules:
1. Use "structured" if the query is about event dates, locations, schedules, announcements, sports scores, or lists of events.
2. Use "vector" if the query is about rules, eligibility, judging criteria, team sizes, equipment, internet access, or rules of participation.
3. Use "both" if the query asks about both.`,
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const classification = JSON.parse(response.text);
      logger.debug('Question classified successfully', { question, classification });
      return classification;
    } catch (err) {
      logger.error('Question classification failed. Falling back to default (both).', { error: err.message });
      return {
        source: 'both',
        event: null,
        collections: ['events', 'announcements', 'sports'],
        isTimeline: false,
        isLiveScore: false
      };
    }
  }
}

module.exports = LlmService;
