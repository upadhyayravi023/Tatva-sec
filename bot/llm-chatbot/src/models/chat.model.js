'use strict';

const { getMongoClient, getPdfEmbeddingsCollection } = require('../config/mongodb');
const env = require('../config/env');
const logger = require('../shared/logger');

class ChatModel {
  /**
   * Performs MongoDB Atlas Vector Search on the pdf_embeddings collection.
   *
   * @param {number[]} queryVector  - Search query embedding
   * @param {string|null} eventFilter - Event name to filter by (optional)
   * @param {number} [limit]        - Max results to return
   * @returns {Promise<Array<object>>} Matching chunks
   */
  static async vectorSearch(queryVector, eventFilter = null, limit = 5) {
    let collection;
    try {
      collection = await getPdfEmbeddingsCollection();
    } catch (err) {
      logger.error('Failed to get database collection for vector search', { error: err.message });
      return [];
    }

    const searchStage = {
      index: env.VECTOR_INDEX_NAME || 'vector_index',
      path: 'embedding',
      queryVector,
      numCandidates: 100,
      limit: limit,
    };

    if (eventFilter) {
      searchStage.filter = {
        event: { $eq: eventFilter }
      };
    }

    const pipeline = [
      {
        $vectorSearch: searchStage
      },
      {
        $project: {
          _id: 0,
          text: 1,
          event: 1,
          pageNumber: 1,
          section: 1,
          score: { $meta: 'searchScore' }
        }
      }
    ];

    try {
      const results = await collection.aggregate(pipeline).toArray();
      return results;
    } catch (err) {
      logger.warn('Atlas Vector Search failed. Defaulting to empty context fallback.', {
        error: err.message,
        eventFilter
      });
      return [];
    }
  }

  /**
   * Fetches structured data from MongoDB collections based on classification.
   * Runs queries concurrently using Promise.all to decrease database lookup time.
   *
   * @param {object} classification
   * @param {string[]} classification.collections - Collections to query (e.g. ['events'])
   * @param {string|null} classification.event     - Extracted event name
   * @param {boolean} classification.isTimeline    - True if schedule/timeline is requested
   * @param {boolean} classification.isLiveScore   - True if scores/sports updates are requested
   * @returns {Promise<string>} Structured text context
   */
  static async getStructuredContext(classification) {
    const { collections, event, isTimeline, isLiveScore } = classification;
    let client;
    try {
      client = await getMongoClient();
    } catch (err) {
      logger.error('Failed to connect to Mongo client in mongodb.service', { error: err.message });
      return '';
    }

    const db = client.db('test');
    const queryPromises = [];

    // 1. Query events concurrently
    if (collections.includes('events') || isTimeline) {
      queryPromises.push((async () => {
        try {
          const eventsCol = db.collection('events');
          const query = { isActive: true };

          if (event) {
            query.$or = [
              { event: { $regex: event, $options: 'i' } },
              { sport: { $regex: event, $options: 'i' } }
            ];
          }

          const events = await eventsCol
            .find(query)
            .project({
              event: 1,
              sport: 1,
              type: 1,
              location: 1,
              venue: 1,
              startDate: 1,
              endDate: 1,
              teamSize: 1,
              description: 1,
              schedule: 1
            })
            .limit(10)
            .toArray();

          if (events.length > 0) {
            const formattedEvents = events.map(e => {
              const name = e.type === "Cultural Event" ? e.event : e.sport;
              return `- Event: ${name || 'Unnamed Event'} (${e.type || 'Event'})
  Date: ${e.startDate || 'TBD'} to ${e.endDate || 'TBD'}
  Venue: ${e.venue || 'TBD'}
  Location: ${e.location || 'TBD'}
  Team Size: Min ${e.teamSize?.min || 1}, Max ${e.teamSize?.max || 1}
  Description: ${e.description || 'No description available.'}
  Schedule: ${e.schedule?.time || 'TBD'}`;
            }).join('\n\n');
            return `Events:\n${formattedEvents}`;
          }
        } catch (err) {
          logger.error('Failed to query events collection', { error: err.message });
        }
        return null;
      })());
    }

    // 2. Query announcements concurrently
    if (collections.includes('announcements')) {
      queryPromises.push((async () => {
        try {
          const announceCol = db.collection('announcements');
          const announcements = await announceCol
            .find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .project({ title: 1, content: 1, createdAt: 1 })
            .toArray();

          if (announcements.length > 0) {
            const formattedAnnouncements = announcements.map(a => {
              return `- Title: ${a.title}
  Content: ${a.content}
  Date: ${a.createdAt}`;
            }).join('\n\n');
            return `Latest Announcements:\n${formattedAnnouncements}`;
          }
        } catch (err) {
          logger.error('Failed to query announcements collection', { error: err.message });
        }
        return null;
      })());
    }

    // 3. Query sports concurrently
    if (collections.includes('sports') || isLiveScore) {
      queryPromises.push((async () => {
        try {
          const sportsCol = db.collection('sports');
          const query = {};
          if (event) {
            query.event_name = { $regex: event, $options: 'i' };
          }

          const sports = await sportsCol
            .find(query)
            .limit(5)
            .toArray();

          if (sports.length > 0) {
            const formattedSports = sports.map(s => {
              const teams = Array.isArray(s.team_names) ? s.team_names.join(' vs ') : 'Teams TBD';
              const score = Array.isArray(s.score) ? s.score.join(' - ') : '0 - 0';
              return `- Sport: ${s.event_name}
  Campus: ${s.campus || 'TBD'}
  Status: ${s.is_live ? 'LIVE' : 'Finished'}
  Matchup: ${teams}
  Current Score: ${score}
  Winner: ${s.winner || 'TBD'}`;
            }).join('\n\n');
            return `Sports Scores & Updates:\n${formattedSports}`;
          }
        } catch (err) {
          logger.error('Failed to query sports collection', { error: err.message });
        }
        return null;
      })());
    }

    const results = await Promise.all(queryPromises);
    const contextParts = results.filter(Boolean);

    return contextParts.join('\n\n--------------------------------\n\n');
  }
}

module.exports = ChatModel;
