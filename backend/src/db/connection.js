'use strict';

const { Pool } = require('pg');
const config = require('../config');

let _pool = null;
let _ready = false;

function getPool() {
  if (!_pool) {
    if (!config.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    _pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DB_SSL ? { rejectUnauthorized: false } : undefined,
      // Render environments can fail on IPv6-only DNS resolution.
      // Force IPv4 for outbound PostgreSQL connections.
      family: 4,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return _pool;
}

async function connectDB() {
  if (_ready) return;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('select 1');
    await ensureSchema(client);
    _ready = true;
    console.log('PostgreSQL connected');
  } finally {
    client.release();
  }
}

async function ensureSchema(client = getPool()) {
  await client.query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      username text not null unique,
      password_hash text not null,
      elo integer not null default 1000,
      games_played integer not null default 0,
      games_won integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists users_elo_created_idx on users (elo desc, created_at asc);

    create table if not exists matches (
      id bigserial primary key,
      match_id text not null unique,
      status text not null default 'finished',
      secret_word text not null,
      winner_id text,
      elo_changes jsonb not null default '[]'::jsonb,
      started_at timestamptz not null,
      finished_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );

    create table if not exists match_players (
      id bigserial primary key,
      match_id text not null references matches(match_id) on delete cascade,
      user_id text,
      username text,
      elo_at_start integer,
      guesses integer,
      solved boolean,
      solve_time_ms integer
    );

    create index if not exists match_players_user_started_idx on match_players (user_id, match_id);
  `);
}

function query(text, params) {
  return getPool().query(text, params);
}

function getConnection() {
  return getPool();
}

module.exports = { connectDB, getConnection, query };
