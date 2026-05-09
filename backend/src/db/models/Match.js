'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Match model
 * Persists completed match results for history, replay, and analytics.
 * Active in-progress matches live in-memory (matchService.js) for speed —
 * only written to DB on completion.
 */
const matchSchema = new Schema(
  {
    matchId:   { type: String, required: true, unique: true, index: true },
    status:    { type: String, enum: ['active', 'finished', 'abandoned'], default: 'active' },
    secretWord:{ type: String, required: true },
    players: [
      {
        userId:    { type: String, index: true }, // Changed from ObjectId to String for guest support
        username:  String,
        eloAtStart: Number,
        guesses:   Number,
        solved:    Boolean,
        solveTimeMs: Number,
      },
    ],
    winnerId:   { type: String, default: null }, // Changed from ObjectId to String
    eloChanges: [{ userId: String, delta: Number, newElo: Number }],
    startedAt:  { type: Date, default: Date.now },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for fetching a user's match history efficiently
matchSchema.index({ 'players.userId': 1, startedAt: -1 });

module.exports = mongoose.models.Match || mongoose.model('Match', matchSchema);
