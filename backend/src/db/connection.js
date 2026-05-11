'use strict';

const mongoose = require('mongoose');
const config = require('../config');

let _connected = false;

/**
 * Connect to MongoDB once and reuse the connection.
 * Uses mongoose's built-in connection pooling.
 */
async function connectDB() {
  if (_connected) return;

  const uri = config.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  console.log(`[db] MONGODB_URI loaded: ${uri.startsWith('mongodb+srv://') ? 'mongodb+srv://***' : 'mongodb://***'}`);

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    // HPC: keep connection pool sized for expected concurrency
    maxPoolSize:     20,
    minPoolSize:     2,
    socketTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 8_000,
  });

  _connected = true;
  console.log('✅ MongoDB connected');

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected — will auto-reconnect');
    _connected = false;
  });
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
    _connected = true;
  });
}

function getConnection() {
  return mongoose.connection;
}

module.exports = { connectDB, getConnection };
