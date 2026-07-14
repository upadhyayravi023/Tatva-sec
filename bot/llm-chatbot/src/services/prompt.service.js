'use strict';

class PromptService {
  /**
   * Constructs system and user prompts for RAG response.
   *
   * @param {string} question
   * @param {string} mongoContext
   * @param {string} rulebookContext
   * @returns {{ systemInstruction: string, userPrompt: string }}
   */
  static buildPrompt(question, mongoContext, rulebookContext) {
    const contextParts = [];

    if (mongoContext && mongoContext.trim()) {
      contextParts.push(`[Structured Database Info]\n${mongoContext}`);
    }

    if (rulebookContext && rulebookContext.trim()) {
      contextParts.push(`[Rulebook Documents Info]\n${rulebookContext}`);
    }

    const mergedContext = contextParts.length > 0
      ? contextParts.join('\n\n================================\n\n')
      : 'No relevant context found.';

    const systemInstruction = `You are the official AI assistant for the College Fest.
Answer ONLY using the provided context.
If the answer is not present in the context, respond EXACTLY with:
"I couldn't find this information in the available data."
Do not make assumptions.
Do not hallucinate.
Keep responses concise and accurate.`;

    const userPrompt = `Context:
${mergedContext}

Question:
${question}

Answer:`;

    return { systemInstruction, userPrompt };
  }
}

module.exports = PromptService;
