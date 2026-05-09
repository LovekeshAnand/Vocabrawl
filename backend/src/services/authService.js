'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../db/models/User');
const { JWT_SECRET, JWT_EXPIRES_IN, GAME } = require('../config');

// ── Helpers ───────────────────────────────────────────────────────────────────

function _signToken(user) {
  const payload = { sub: user._id.toString(), username: user.username };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user: user.toJSON() };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Hashes password, persists to MongoDB, returns { token, user }.
 */
async function register(username, password) {
  if (!username || username.length < 3 || username.length > 20)
    throw new Error('Username must be 3–20 characters');
  if (!password || password.length < 6)
    throw new Error('Password must be at least 6 characters');

  const exists = await User.findOne({ username: new RegExp(`^${username}$`, 'i') }).lean();
  if (exists) throw new Error('Username already taken');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash, elo: GAME.ELO.DEFAULT_RATING });
  return _signToken(user);
}

/**
 * Login with username + password.
 * Returns { token, user } on success.
 */
async function login(username, password) {
  const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
  if (!user) throw new Error('Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');

  return _signToken(user);
}

/**
 * Guest Login - Creates a session-based token without DB storage.
 * Returns { token, user: { username, isGuest: true, ... } }.
 */
async function guestLogin(username) {
  if (!username || username.length < 3 || username.length > 20)
    throw new Error('Username must be 3–20 characters');

  // We use a unique guest ID and a specific sub prefix
  const guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
  const user = {
    id: guestId,
    _id: guestId, // for internal consistency
    username: `${username}#Guest`,
    elo: GAME.ELO.DEFAULT_RATING,
    isGuest: true,
    toJSON: () => ({ id: guestId, username: `${username}#Guest`, elo: GAME.ELO.DEFAULT_RATING, isGuest: true })
  };

  return _signToken(user);
}

/**
 * Verify a JWT and return the payload.
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws on invalid/expired
}

/**
 * Fetch a user by their MongoDB ObjectId (from JWT sub field).
 */
async function getUserById(id) {
  const user = await User.findById(id).lean();
  if (!user) return null;
  // Strip passwordHash from lean object
  const { passwordHash: _pw, ...safe } = user;
  return { ...safe, id: user._id.toString() };
}

/**
 * Atomically update ELO and game stats after a match.
 */
async function updateElo(userId, newElo, won) {
  await User.findByIdAndUpdate(userId, {
    $set: { elo: newElo },
    $inc: { gamesPlayed: 1, ...(won ? { gamesWon: 1 } : {}) },
  });
}

/**
 * Top-N users by ELO for the leaderboard.
 * Uses the { elo: -1 } index for O(log n + limit) query.
 */
async function getLeaderboard(limit = 20) {
  const users = await User.find()
    .sort({ elo: -1, createdAt: 1 })
    .limit(limit)
    .lean();

  return users.map((u, i) => ({
    rank:        i + 1,
    id:          u._id.toString(),
    username:    u.username,
    elo:         u.elo,
    gamesPlayed: u.gamesPlayed,
    gamesWon:    u.gamesWon,
  }));
}

module.exports = { register, login, guestLogin, verifyToken, getUserById, updateElo, getLeaderboard };
