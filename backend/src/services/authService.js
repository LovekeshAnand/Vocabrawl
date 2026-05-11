'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../db/connection');
const { JWT_SECRET, JWT_EXPIRES_IN, GAME } = require('../config');

function _toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    elo: row.elo,
    gamesPlayed: row.games_played ?? 0,
    gamesWon: row.games_won ?? 0,
  };
}

function _signToken(user) {
  const payload = { sub: String(user.id), username: user.username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user: user.isGuest ? user : _toPublicUser(user) };
}

async function register(username, password) {
  if (!username || username.length < 3 || username.length > 20)
    throw new Error('Username must be 3-20 characters');
  if (!password || password.length < 6)
    throw new Error('Password must be at least 6 characters');

  const exists = await query('select id from users where lower(username) = lower($1) limit 1', [username]);
  if (exists.rowCount) throw new Error('Username already taken');

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    `insert into users (username, password_hash, elo)
     values ($1, $2, $3)
     returning id, username, elo, games_played, games_won`,
    [username, passwordHash, GAME.ELO.DEFAULT_RATING]
  );

  return _signToken(result.rows[0]);
}

async function login(username, password) {
  const result = await query(
    `select id, username, password_hash, elo, games_played, games_won
     from users
     where lower(username) = lower($1)
     limit 1`,
    [username]
  );
  const user = result.rows[0];
  if (!user) throw new Error('Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('Invalid credentials');

  return _signToken(user);
}

async function guestLogin(username) {
  if (!username || username.length < 3 || username.length > 20)
    throw new Error('Username must be 3-20 characters');

  const guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
  const user = {
    id: guestId,
    username: `${username}#Guest`,
    elo: GAME.ELO.DEFAULT_RATING,
    isGuest: true,
  };

  return _signToken(user);
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function getUserById(id) {
  if (!id || String(id).startsWith('guest_')) return null;
  const result = await query(
    `select id, username, elo, games_played, games_won
     from users
     where id = $1
     limit 1`,
    [id]
  );
  return result.rows[0] ? _toPublicUser(result.rows[0]) : null;
}

async function updateElo(userId, newElo, won) {
  if (!userId || String(userId).startsWith('guest_')) return;
  await query(
    `update users
     set elo = $2,
         games_played = games_played + 1,
         games_won = games_won + $3,
         updated_at = now()
     where id = $1`,
    [userId, newElo, won ? 1 : 0]
  );
}

async function getLeaderboard(limit = 20) {
  const result = await query(
    `select id, username, elo, games_played, games_won
     from users
     order by elo desc, created_at asc
     limit $1`,
    [limit]
  );

  return result.rows.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    username: u.username,
    elo: u.elo,
    gamesPlayed: u.games_played,
    gamesWon: u.games_won,
  }));
}

module.exports = { register, login, guestLogin, verifyToken, getUserById, updateElo, getLeaderboard };
