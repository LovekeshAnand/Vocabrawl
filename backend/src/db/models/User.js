'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * User model
 * Stores auth credentials + ELO + match stats.
 *
 * Index on `username` (unique, case-insensitive lookup key).
 * Index on `elo` (descending) for fast leaderboard queries.
 */
const userSchema = new Schema(
  {
    username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    passwordHash: { type: String, required: true },
    elo:          { type: Number, default: 1000, index: true },
    gamesPlayed:  { type: Number, default: 0 },
    gamesWon:     { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // HPC: only return needed fields in toJSON — avoid serialising passwordHash
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Compound index for leaderboard: elo DESC, then createdAt ASC (tie-break)
userSchema.index({ elo: -1, createdAt: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
