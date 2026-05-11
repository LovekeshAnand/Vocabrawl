'use strict';

const mongoose = require('mongoose');
const config = require('../config');

let _connected = false;

function describeMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, '') || '(none)';
    const authSource = parsed.searchParams.get('authSource') || '(default)';
    return {
      host: parsed.host,
      username: decodeURIComponent(parsed.username || ''),
      passwordLength: decodeURIComponent(parsed.password || '').length,
      dbName,
      authSource,
    };
  } catch {
    return null;
  }
}

async function connectDB() {
  if (_connected) return;

  const uri = config.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  const uriInfo = describeMongoUri(uri);
  console.log(`[db] MONGODB_URI loaded: ${uri.startsWith('mongodb+srv://') ? 'mongodb+srv://***' : 'mongodb://***'}`);
  if (uriInfo) {
    console.log(`[db] Mongo target host=${uriInfo.host} db=${uriInfo.dbName} user=${uriInfo.username} passwordLength=${uriInfo.passwordLength} authSource=${uriInfo.authSource}`);
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      maxPoolSize:     20,
      minPoolSize:     2,
      socketTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 8_000,
      // REMOVED authSource override - let it use what's in the URI
    });

    _connected = true;
    console.log('✅ MongoDB connected successfully');

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected — will auto-reconnect');
      _connected = false;
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      _connected = true;
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error details:', {
      message: error.message,
      code: error.code,
      codeName: error.codeName,
      name: error.name
    });
    throw error;
  }
}

function getConnection() {
  return mongoose.connection;
}

module.exports = { connectDB, getConnection };