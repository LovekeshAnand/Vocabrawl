'use strict';

const express        = require('express');
const http           = require('http');
const cors           = require('cors');
const { Server }     = require('socket.io');

const config         = require('./config');
const { connectDB }  = require('./db/connection');
const authRoutes     = require('./routes/auth');
const lbRoutes       = require('./routes/leaderboard');
const { initSocket } = require('./socket');

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

const allowedOrigins = [
  config.FRONTEND_URL,
  ...config.FRONTEND_URLS.split(',').map((o) => o.trim()).filter(Boolean),
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '16kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/api/auth',        authRoutes);
app.use('/api/leaderboard', lbRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── HTTP + Socket.io ──────────────────────────────────────────────────────────
const server = http.createServer(app);
const io     = new Server(server, {
  cors:              {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  perMessageDeflate: false,   // HPC: skip compression for lower latency
  pingInterval:      10_000,
  pingTimeout:       5_000,
});

initSocket(io);

// ── Boot sequence: DB first, then listen ─────────────────────────────────────
(async () => {
  try {
    await connectDB();

    server.listen(config.PORT, () => {
      console.log(`\n🚀 VocaBrawl server  →  http://localhost:${config.PORT}`);
      console.log(`   Frontend          →  ${config.FRONTEND_URL}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
})();

