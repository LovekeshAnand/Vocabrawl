'use strict';
require('dotenv').config();

module.exports = {
  PORT:           parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL:   process.env.FRONTEND_URL || 'http://localhost:3000',
  MONGODB_URI:    process.env.MONGODB_URI,
  JWT_SECRET:     process.env.JWT_SECRET || 'vocabrawl-super-secret-dev-key-change-in-prod',
  JWT_EXPIRES_IN: '7d',

  GAME: {
    MODES: {
      BRAWL: 'brawl',
      WORD_CHAIN: 'word_chain',
      ANAGRAMS: 'anagrams',
    },
    WORD_LENGTH: 5,
    MAX_GUESSES: 6,
    MATCHMAKING_TIMEOUT_MS: 30_000,
    GUESS_RATE_LIMIT_MS: 400,
    ROUND_TIME_LIMIT_MS: 120_000,
    CHAIN_TARGET_SCORE: 100,
    ANAGRAM_TARGET_SCORE: 250,
    AURA_MODE_THRESHOLD_MS: 15_000,
    GAUNTLET_BASE_TIME_MS: 60_000,
    GAUNTLET_BONUS_MS: 15_000,
    PRIVATE_ROOM_EXPIRE_MS: 300_000, // 5 minutes
    ELO: {
      K_FACTOR: 32,
      DEFAULT_RATING: 1000,
    },
  },
};
