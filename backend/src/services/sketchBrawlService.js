'use strict';

/**
 * SketchBrawlService — Manages multi-player draw-and-guess lobbies.
 *
 * Architecture:
 *  - Lobbies are stored in-memory (Map). Capacity up to 8 players.
 *  - Game loop: host picks word → drawer draws → others guess → rotate drawer.
 *  - Chat-level word detection: exact match (case-insensitive) triggers a "solved" event.
 *  - Drawing strokes are relayed verbatim (x, y, color, size) — no server storage.
 *  - Round timer enforced server-side with setTimeout.
 *
 * HPC notes:
 *  - O(1) lobby lookup by lobbyId (Map).
 *  - Drawing relay is pass-through — no processing, just broadcast.
 *  - Rate-limited to prevent canvas spam (50ms debounce per socket).
 */

const { getRandomWord } = require('../data/words');

const _lobbies      = new Map();   // lobbyId → LobbyState
const _socketLobby  = new Map();   // socketId → lobbyId (for cleanup)
const _drawRateLimit = new Map();  // socketId → lastDrawMs

const ROUND_DURATION_MS = 80_000;  // 80 seconds
const MAX_PLAYERS       = 8;
const HINTS_AT_SECONDS  = [60, 40]; // reveal a letter hint at these seconds remaining

// ── Helpers ────────────────────────────────────────────────────────────────────

function _generateLobbyId() {
  return `sketchbrawl_${Date.now().toString(36)}_${(Math.random() * 0xffff | 0).toString(36)}`;
}

function _makePlayer(socketId, userId, username, isHost = false) {
  return { socketId, userId, username, score: 0, isHost, solved: false };
}

function _obfuscateWord(word) {
  return word.split('').map(c => c === ' ' ? ' ' : '_').join('');
}

function _revealLetterHint(word, existing) {
  // Pick a random unrevealed position
  const hidden = [];
  for (let i = 0; i < word.length; i++) {
    if (existing[i] === '_') hidden.push(i);
  }
  if (!hidden.length) return existing;
  const idx = hidden[Math.floor(Math.random() * hidden.length)];
  const arr = existing.split('');
  arr[idx] = word[idx];
  return arr.join('');
}

// ── Lobby lifecycle ────────────────────────────────────────────────────────────

function createLobby(socketId, userId, username, options = {}) {
  const lobbyId = _generateLobbyId();
  const host    = _makePlayer(socketId, userId, username, true);

  const lobby = {
    id:          lobbyId,
    status:      'waiting',  // waiting | playing | finished
    players:     [host],
    drawerIdx:   0,
    round:       0,
    totalRounds: options.rounds || 3,
    secretWord:  null,
    hint:        null,
    roundTimer:  null,
    hintTimers:  [],
    maxPlayers:  options.maxPlayers || MAX_PLAYERS,
    visibility:  options.visibility || 'public',
    scores:      {},
    createdAt:   Date.now(),
  };
  lobby.scores[socketId] = 0;

  _lobbies.set(lobbyId, lobby);
  _socketLobby.set(socketId, lobbyId);

  return { lobbyId, lobby: _safeView(lobby) };
}

function joinLobby(lobbyId, socketId, userId, username) {
  const lobby = _lobbies.get(lobbyId);
  if (!lobby)                             return { error: 'Lobby not found' };
  
  // Handle reconnection: if userId is already in lobby, update socketId
  const existingPlayer = lobby.players.find(p => p.userId === userId);
  if (existingPlayer) {
    // Cleanup old socket mapping
    _socketLobby.delete(existingPlayer.socketId);
    delete lobby.scores[existingPlayer.socketId];

    existingPlayer.socketId = socketId;
    _socketLobby.set(socketId, lobbyId);
    lobby.scores[socketId] = existingPlayer.score;
    return { lobbyId, lobby: _safeView(lobby) };
  }

  if (lobby.status !== 'waiting')         return { error: 'Game already started' };
  if (lobby.players.length >= lobby.maxPlayers) return { error: 'Lobby is full' };

  const player = _makePlayer(socketId, userId, username);
  lobby.players.push(player);
  lobby.scores[socketId] = 0;
  _socketLobby.set(socketId, lobbyId);

  return { lobbyId, lobby: _safeView(lobby) };
}

function leaveLobby(socketId) {
  const lobbyId = _socketLobby.get(socketId);
  if (!lobbyId) return null;

  const lobby = _lobbies.get(lobbyId);
  if (!lobby) { _socketLobby.delete(socketId); return null; }

  const leftPlayer = lobby.players.find(p => p.socketId === socketId);
  const username = leftPlayer ? leftPlayer.username : 'Someone';

  lobby.players = lobby.players.filter(p => p.socketId !== socketId);
  delete lobby.scores[socketId];
  _socketLobby.delete(socketId);

  if (lobby.players.length === 0) {
    _clearTimers(lobby);
    _lobbies.delete(lobbyId);
    return { lobbyId, disbanded: true, username };
  }

  // Transfer host if needed
  if (!lobby.players.some(p => p.isHost)) {
    lobby.players[0].isHost = true;
  }

  return { lobbyId, lobby: _safeView(lobby), username };
}

function startGame(lobbyId, hostSocketId) {
  const lobby = _lobbies.get(lobbyId);
  if (!lobby) return { error: 'Lobby not found' };
  if (!lobby.players.find(p => p.socketId === hostSocketId && p.isHost)) return { error: 'Only host can start' };
  if (lobby.players.length < 2) return { error: 'Need at least 2 players' };
  if (lobby.status === 'playing') return { error: 'Already playing' };

  lobby.status  = 'playing';
  lobby.round   = 1;
  lobby.drawerIdx = 0;
  // Reset solved flags
  lobby.players.forEach(p => { p.solved = false; });

  return _beginTurn(lobby);
}

function _beginTurn(lobby) {
  _clearTimers(lobby);
  const drawer    = lobby.players[lobby.drawerIdx % lobby.players.length];
  lobby.secretWord = getRandomWord();
  lobby.hint       = _obfuscateWord(lobby.secretWord);

  // Reset solved flags for non-drawers
  lobby.players.forEach(p => { if (p.socketId !== drawer.socketId) p.solved = false; });

  // Round timer
  lobby.roundTimer = setTimeout(() => {
    _endTurn(lobby, true);
  }, ROUND_DURATION_MS);

  // Hint timers
  HINTS_AT_SECONDS.forEach(sec => {
    const delay = ROUND_DURATION_MS - sec * 1000;
    if (delay > 0) {
      const ht = setTimeout(() => {
        lobby.hint = _revealLetterHint(lobby.secretWord, lobby.hint);
        // Caller will broadcast this — store updated hint, fire event via callback
      }, delay);
      lobby.hintTimers.push(ht);
    }
  });

  return {
    lobbyId:    lobby.id,
    drawer:     drawer.socketId,
    drawerName: drawer.username,
    secretWord: lobby.secretWord,
    hint:       lobby.hint,
    wordLength: lobby.secretWord.length,
    round:      lobby.round,
    totalRounds: lobby.totalRounds,
    durationMs: ROUND_DURATION_MS,
    players:    _safeView(lobby).players,
  };
}

function _endTurn(lobby, timedOut = false) {
  _clearTimers(lobby);
  const wasWord  = lobby.secretWord;
  const drawer   = lobby.players[lobby.drawerIdx % lobby.players.length];

  // Advance
  lobby.drawerIdx++;
  const nextRound = Math.floor(lobby.drawerIdx / lobby.players.length) + 1;
  const isGameOver = nextRound > lobby.totalRounds && lobby.drawerIdx % lobby.players.length === 0;

  if (isGameOver) {
    lobby.status = 'finished';
    return { lobbyId: lobby.id, turnEnd: true, secretWord: wasWord, gameOver: true, scores: { ...lobby.scores } };
  }

  if (nextRound > lobby.round) lobby.round = nextRound;

  return { lobbyId: lobby.id, turnEnd: true, secretWord: wasWord, timedOut, nextTurnIn: 3000 };
}

function _clearTimers(lobby) {
  if (lobby.roundTimer) { clearTimeout(lobby.roundTimer); lobby.roundTimer = null; }
  lobby.hintTimers.forEach(t => clearTimeout(t));
  lobby.hintTimers = [];
}

// ── Word guess (chat) ──────────────────────────────────────────────────────────

/**
 * Handles a chat message — checks if it matches the secret word.
 * Returns { solved, message, sender, scoreDelta }
 */
function handleChat(lobbyId, socketId, message) {
  const lobby = _lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'playing') return { ok: false, error: 'no_active_game' };

  const player = lobby.players.find(p => p.socketId === socketId);
  if (!player) return { ok: false, error: 'not_in_lobby' };

  // Drawer cannot send chat (only draw)
  const drawer = lobby.players[lobby.drawerIdx % lobby.players.length];
  if (drawer.socketId === socketId) return { ok: false, error: 'drawer_no_chat' };

  // Already solved — let them chat freely
  if (player.solved) {
    return { ok: true, solved: false, censored: false, message, sender: player.username };
  }

  // Word detection — exact match (case-insensitive, trimmed)
  const isCorrect = message.trim().toUpperCase() === lobby.secretWord.toUpperCase();

  if (isCorrect) {
    player.solved = true;
    // Score: 100 * (players_remaining / total) — faster solvers get more
    const guessers       = lobby.players.filter(p => p.socketId !== drawer.socketId);
    const solvedCount    = guessers.filter(p => p.solved).length;
    const scoreDelta     = Math.max(20, 100 - (solvedCount - 1) * 20);
    lobby.scores[socketId] = (lobby.scores[socketId] || 0) + scoreDelta;
    player.score += scoreDelta;
    // Drawer also gets points per solver
    lobby.scores[drawer.socketId] = (lobby.scores[drawer.socketId] || 0) + 15;

    // Check if all guessed — end turn early
    const allSolved = guessers.every(p => p.solved);
    return {
      ok: true, solved: true, scoreDelta,
      allSolved,
      scores:    { ...lobby.scores },
      sender:    player.username,
    };
  }

  // Censor the message if it's close (contains the word)
  const censored = message.toLowerCase().includes(lobby.secretWord.toLowerCase());
  const displayMsg = censored ? message.replace(new RegExp(lobby.secretWord, 'gi'), '***') : message;

  return { ok: true, solved: false, censored, message: displayMsg, sender: player.username };
}

// ── Relay drawing strokes ──────────────────────────────────────────────────────

function canDraw(socketId) {
  const now  = Date.now();
  const last = _drawRateLimit.get(socketId) || 0;
  if (now - last < 16) return false;  // ~60fps cap
  _drawRateLimit.set(socketId, now);
  return true;
}

function isDrawer(lobbyId, socketId) {
  const lobby = _lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'playing') return false;
  const drawer = lobby.players[lobby.drawerIdx % lobby.players.length];
  return drawer.socketId === socketId;
}

// ── Public lobby list ──────────────────────────────────────────────────────────

function getPublicLobbies() {
  const list = [];
  for (const [id, lobby] of _lobbies.entries()) {
    if (lobby.visibility === 'public') {
      list.push({
        id,
        hostName:     lobby.players[0]?.username ?? 'Unknown',
        playerCount:  lobby.players.length,
        maxPlayers:   lobby.maxPlayers,
        status:       lobby.status,
        round:        lobby.round,
        totalRounds:  lobby.totalRounds,
      });
    }
  }
  return list;
}

// ── Safe view (strip secret word) ─────────────────────────────────────────────

function _safeView(lobby) {
  return {
    id:          lobby.id,
    status:      lobby.status,
    players:     lobby.players.map(p => ({ socketId: p.socketId, userId: p.userId, username: p.username, score: p.score, isHost: p.isHost, solved: p.solved })),
    round:       lobby.round,
    totalRounds: lobby.totalRounds,
    hint:        lobby.hint,
    visibility:  lobby.visibility,
  };
}

function getLobby(lobbyId) {
  const lobby = _lobbies.get(lobbyId);
  return lobby ? _safeView(lobby) : null;
}

function getSocketLobby(socketId) {
  return _socketLobby.get(socketId) || null;
}

function nextTurn(lobbyId) {
  const lobby = _lobbies.get(lobbyId);
  if (!lobby) return null;
  return _beginTurn(lobby);
}

function endTurnEarly(lobbyId) {
  const lobby = _lobbies.get(lobbyId);
  if (!lobby) return null;
  return _endTurn(lobby, false);
}

module.exports = {
  createLobby,
  joinLobby,
  leaveLobby,
  startGame,
  nextTurn,
  endTurnEarly,
  handleChat,
  canDraw,
  isDrawer,
  getPublicLobbies,
  getLobby,
  getSocketLobby,
};

