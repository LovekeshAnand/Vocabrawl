'use strict';

const dns = require('dns');

// Force Node.js to prefer IPv4 over IPv6
// Fixes Render + Supabase ENETUNREACH issues
dns.setDefaultResultOrder('ipv4first');

const { Pool } = require('pg');
const config = require('../config');

let _pool = null;
let _ready = false;

function getPool() {
  if (!_pool) {
    if (!config.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }

    _pool = new Pool({
      connectionString: config.DATABASE_URL,

      // Required for Render + Supabase
      ssl: config.DB_SSL
        ? {
            rejectUnauthorized: false,
          }
        : false,

      // Force IPv4
      family: 4,

      // Pool settings
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    _pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }

  return _pool;
}

async function connectDB() {
  if (_ready) return;

  try {
    const pool = getPool();

    console.log('Connecting to PostgreSQL...');

    const client = await pool.connect();

    try {
      await client.query('SELECT 1');

      await ensureSchema(client);

      _ready = true;

      console.log('✅ PostgreSQL connected successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
}

async function ensureSchema(client = getPool()) {
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      elo INTEGER NOT NULL DEFAULT 1000,
      games_played INTEGER NOT NULL DEFAULT 0,
      games_won INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS users_elo_created_idx
    ON users (elo DESC, created_at ASC);

    CREATE TABLE IF NOT EXISTS matches (
      id BIGSERIAL PRIMARY KEY,
      match_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'finished',
      secret_word TEXT NOT NULL,
      winner_id TEXT,
      elo_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
      started_at TIMESTAMPTZ NOT NULL,
      finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS match_players (
      id BIGSERIAL PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
      user_id TEXT,
      username TEXT,
      elo_at_start INTEGER,
      guesses INTEGER,
      solved BOOLEAN,
      solve_time_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS match_players_user_started_idx
    ON match_players (user_id, match_id);
  `);
}

async function query(text, params) {
  const pool = getPool();
  return pool.query(text, params);
}

function getConnection() {
  return getPool();
}

async function closeDB() {
  if (_pool) {
    await _pool.end();
    console.log('PostgreSQL pool closed');
  }
}

module.exports = {
  connectDB,
  getConnection,
  query,
  closeDB,
};