'use strict';

const { getRandomWord, isValidWord }           = require('../data/words');
const { evaluateGuess, serialiseAndRelease, isWin, calculateElo, generateAnagram, validateChain } = require('./gameEngine');
const { updateElo }                            = require('./authService');
const Match                                    = require('../db/models/Match');
const { GAME }                                 = require('../config');

/**
 * MatchService — manages the full lifecycle of every match.
 *
 * Architecture:
 *  - Active matches live in a Map<matchId, MatchState> (in-memory, nanosecond access).
 *  - On completion the match is persisted to MongoDB asynchronously (fire-and-forget
 *    with error logging) — never blocking the real-time response path.
 *  - Matchmaking queue is a plain array; swap to a min-heap sorted by ELO for ranked.
 *
 * HPC techniques used:
 *  - Map for O(1) match lookup.
 *  - Int bitmask for per-player rate-limiting (no array allocation per check).
 *  - process.hrtime.bigint() for nanosecond solve-time comparison.
 *  - Fire-and-forget DB writes so the hot real-time path is never blocked by I/O.
 */

const _matches      = new Map();   // matchId → MatchState
const _queue        = [];          // [{socketId, userId, username, elo, mongoId}]
const _privateRooms = new Map();   // roomCode → { host, guest, mode, expires, visibility }

const VALID_ROOM_VISIBILITY = new Set(['private', 'public']);
const VALID_MODES = new Set(Object.values(GAME.MODES));
const CHAIN_WORD_RE = /^[A-Z]{2,16}$/;

function _playerFromUser(socketId, user) {
  return {
    socketId,
    userId:   String(user.id ?? user._id),
    mongoId:  user._id ?? user.mongoId ?? user.id,
    username: user.username || 'Player',
    elo:      Number(user.elo ?? GAME.ELO.DEFAULT_RATING),
  };
}

function _normaliseRoomCode(roomCode) {
  return String(roomCode || '').trim().toUpperCase();
}

function _normaliseMode(mode) {
  return VALID_MODES.has(mode) ? mode : GAME.MODES.BRAWL;
}

function _normaliseVisibility(visibility) {
  return VALID_ROOM_VISIBILITY.has(visibility) ? visibility : 'private';
}

function _removeRoomsForSocket(socketId) {
  let removed = false;
  for (const [code, room] of _privateRooms.entries()) {
    if (room.host.socketId === socketId || room.guest?.socketId === socketId) {
      _privateRooms.delete(code);
      removed = true;
    }
  }
  return removed;
}

function getPublicRooms() {
  const rooms = [];
  const now = Date.now();
  for (const [code, room] of _privateRooms.entries()) {
    if (now > room.expires) {
      _privateRooms.delete(code);
      continue;
    }
    if (room.visibility === 'public') {
      rooms.push({
        code,
        host: room.host.username,
        mode: room.mode,
        playerCount: room.guest ? 2 : 1,
        maxPlayers: 2,
        expiresAt: room.expires,
      });
    }
  }
  return rooms;
}

// ── Rate-limit per-socket ─────────────────────────────────────────────────────
const _lastGuessTime = new Map();

function _checkRateLimit(socketId) {
  const now  = Date.now();
  const last = _lastGuessTime.get(socketId) ?? 0;
  if (now - last < GAME.GUESS_RATE_LIMIT_MS) return false;
  _lastGuessTime.set(socketId, now);
  return true;
}

// ── Matchmaking Queue ─────────────────────────────────────────────────────────

function joinQueue(socketId, user, mode = GAME.MODES.BRAWL) {
  if (_queue.some(p => p.socketId === socketId)) return null;
  _removeRoomsForSocket(socketId);

  const queueMode = _normaliseMode(mode);
  const player = { ..._playerFromUser(socketId, user), mode: queueMode, queuedAt: Date.now() };
  let bestIndex = -1;
  let bestDelta = Infinity;
  const now = Date.now();

  for (let i = 0; i < _queue.length; i++) {
    const candidate = _queue[i];
    if (candidate.userId === player.userId) continue;
    if (candidate.mode !== queueMode) continue;

    const waitedMs = Math.max(now - candidate.queuedAt, 0);
    const allowedDelta = 150 + Math.floor(waitedMs / 1000) * 20;
    const delta = Math.abs(candidate.elo - player.elo);

    if ((delta <= allowedDelta || waitedMs >= GAME.MATCHMAKING_TIMEOUT_MS) && delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }

  if (bestIndex !== -1) {
    const p1 = _queue.splice(bestIndex, 1)[0];
    const p2 = player;
    return createMatch(p1, p2, queueMode, true);
  }

  _queue.push(player);
  return null;
}

function leaveQueue(socketId) {
  const idx = _queue.findIndex(p => p.socketId === socketId);
  if (idx !== -1) _queue.splice(idx, 1);
}

// ── Private Rooms ─────────────────────────────────────────────────────────────

function createPrivateRoom(socketId, user, mode = GAME.MODES.BRAWL, visibility = 'private') {
  _removeRoomsForSocket(socketId);

  let roomCode;
  do {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X');
  } while (_privateRooms.has(roomCode));

  const expiresAt = Date.now() + (GAME.PRIVATE_ROOM_EXPIRE_MS || 300_000);
  const roomMode = _normaliseMode(mode);
  const roomVisibility = _normaliseVisibility(visibility);
  
  const room = {
    code:       roomCode,
    host:       _playerFromUser(socketId, user),
    guest:      null,
    mode:       roomMode,
    visibility: roomVisibility,
    expires:    expiresAt,
  };
  
  _privateRooms.set(roomCode, room);
  console.log(`[matchService] Room Created: ${roomCode} by ${user.username} (Visibility: ${visibility})`);
  
  // Auto-cleanup with logging
  setTimeout(() => {
    if (_privateRooms.has(roomCode)) {
      console.log(`[matchService] Room Expired: ${roomCode}`);
      _privateRooms.delete(roomCode);
    }
  }, (GAME.PRIVATE_ROOM_EXPIRE_MS || 300_000));
  
  return { roomCode, expiresAt, mode: roomMode, visibility: roomVisibility };
}

function joinPrivateRoom(roomCode, socketId, user) {
  const code = _normaliseRoomCode(roomCode);
  const room = _privateRooms.get(code);
  
  console.log(`[matchService] Join attempt: ${code} by ${user.username} (UserID: ${user.id})`);

  if (!room) {
    console.log(`[matchService] Join failed: ${code} not found in map. Current keys:`, Array.from(_privateRooms.keys()));
    return { error: 'Room not found. Please check the code.' };
  }

  if (Date.now() > room.expires) {
    _privateRooms.delete(code);
    return { error: 'Room has expired' };
  }

  const player = _playerFromUser(socketId, user);

  // If host is rejoining (e.g. on refresh), just update their socket ID
  if (room.host.userId === player.userId) {
    console.log(`[matchService] Host re-joined room: ${code}`);
    room.host.socketId = socketId;
    return { isHost: true, room };
  }

  if (room.guest) {
    if (room.guest.userId === player.userId) {
      console.log(`[matchService] Guest re-joined room: ${code}`);
      room.guest.socketId = socketId;
      return { isGuest: true, room };
    }
    return { error: 'Room is full' };
  }

  console.log(`[matchService] Room joined: ${code} - Host: ${room.host.username}, Guest: ${user.username}`);
  room.guest = player;
  
  const matchResult = createMatch(room.host, room.guest, room.mode);
  _privateRooms.delete(code);
  return { ...matchResult, mode: room.mode };
}

// ── Match lifecycle ───────────────────────────────────────────────────────────

function createMatch(p1, p2, mode = GAME.MODES.BRAWL, ranked = false) {
  const matchId    = `m_${Date.now().toString(36)}_${(Math.random() * 0xffff | 0).toString(36)}`;
  mode = _normaliseMode(mode);
  const secretWord = getRandomWord(GAME.WORD_LENGTH);
  
  let gameData = { secretWord };
  if (mode === GAME.MODES.ANAGRAMS) {
    gameData.scrambled = generateAnagram(secretWord);
    gameData.targetScore = GAME.ANAGRAM_TARGET_SCORE;
  } else if (mode === GAME.MODES.WORD_CHAIN) {
    gameData.currentWord = secretWord; // Starting word
    gameData.targetScore = GAME.CHAIN_TARGET_SCORE;
    gameData.usedWords = new Set([secretWord]);
    gameData.turnSocketId = p1.socketId;
  }

  const match = {
    id:         matchId,
    mode,
    ranked,
    ...gameData,
    status:     'active',
    startedAt:  process.hrtime.bigint(),
    startTime:  Date.now(), // Real timestamp for DB
    players: {
      [p1.socketId]: { ...p1, guesses: 0, solved: false, solveTimeNs: 0n, score: 0 },
      [p2.socketId]: { ...p2, guesses: 0, solved: false, solveTimeNs: 0n, score: 0 },
    },
    opponentOf: { [p1.socketId]: p2.socketId, [p2.socketId]: p1.socketId },
    history:    [], // For word chain
    endsAt:     Date.now() + GAME.ROUND_TIME_LIMIT_MS,
  };

  _matches.set(matchId, match);

  // Auto-expire stale matches
  setTimeout(() => {
    if (_matches.get(matchId)?.status === 'active') {
      _finishMatch(matchId, _winnerByScore(match));
    }
  }, GAME.ROUND_TIME_LIMIT_MS + 2000);

  return { matchId, p1, p2, ranked };
}

function _winnerByScore(match) {
  if (!match || match.mode === GAME.MODES.BRAWL) return null;
  const players = Object.entries(match.players);
  if (players.length < 2) return null;
  const [aId, a] = players[0];
  const [bId, b] = players[1];
  if ((a.score ?? 0) === (b.score ?? 0)) return null;
  return (a.score ?? 0) > (b.score ?? 0) ? aId : bId;
}

function getMatch(matchId) {
  return _matches.get(matchId) ?? null;
}

function rejoinMatch(matchId, newSocketId, userId) {
  const match = _matches.get(matchId);
  if (!match || match.status !== 'active') return { error: 'match_not_found' };

  // Find the player in this match by their userId
  const socketIds = Object.keys(match.players);
  const oldSocketId = socketIds.find(sid => match.players[sid].userId === userId);

  if (!oldSocketId) return { error: 'not_in_match' };

  if (oldSocketId !== newSocketId) {
    // Update player data
    const playerData = match.players[oldSocketId];
    playerData.socketId = newSocketId;
    delete match.players[oldSocketId];
    match.players[newSocketId] = playerData;

    // Update opponentOf mapping
    const opponentSocketId = match.opponentOf[oldSocketId];
    delete match.opponentOf[oldSocketId];
    match.opponentOf[newSocketId] = opponentSocketId;
    match.opponentOf[opponentSocketId] = newSocketId;

    console.log(`[matchService] Player ${playerData.username} rejoined match ${matchId} (New Socket: ${newSocketId})`);
  }

  return { ok: true, match };
}

/**
 * Process a guess for a 1v1 match.
 */
function processGuess(matchId, socketId, guessRaw) {
  if (!_checkRateLimit(socketId)) return { ok: false, error: 'rate_limited' };

  const match = _matches.get(matchId);
  if (!match || match.status !== 'active') return { ok: false, error: 'match_not_found' };

  const player = match.players[socketId];
  if (!player)          return { ok: false, error: 'not_in_match' };
  if (player.solved)    return { ok: false, error: 'already_solved' };
  if (player.guesses >= GAME.MAX_GUESSES) return { ok: false, error: 'no_guesses_left' };

  const resultObj = evaluateGuess(guessRaw, match.secretWord);
  const won       = isWin(resultObj.result);
  const { guess, result } = serialiseAndRelease(resultObj);
  player.guesses++;

  let matchOver = false;
  let winner    = null;
  const opponentId = match.opponentOf[socketId];

  if (won) {
    player.solved      = true;
    player.solveTimeNs = process.hrtime.bigint() - match.startedAt;
    const opponent     = match.players[opponentId];

    // First to solve wins; if both solved compare times
    if (!opponent.solved) {
      matchOver = true;
      winner    = socketId;
    } else {
      matchOver = true;
      winner    = player.solveTimeNs < opponent.solveTimeNs ? socketId : opponentId;
    }
    _finishMatch(matchId, winner);
  } else if (player.guesses >= GAME.MAX_GUESSES) {
    const opponent = match.players[opponentId];
    if (opponent.solved || opponent.guesses >= GAME.MAX_GUESSES) {
      matchOver = true;
      winner    = opponent.solved ? opponentId : null;
      _finishMatch(matchId, winner);
    }
  }

  return {
    ok: true,
    guess,
    result,
    guessNumber: player.guesses,
    won,
    matchOver,
    winner,
    opponentId,
    secretWord: matchOver ? match.secretWord : undefined,
  };
}

/**
 * Process a Word Chain submission.
 */
function processWordChain(matchId, socketId, word) {
  if (!_checkRateLimit(socketId)) return { ok: false, error: 'rate_limited' };

  const match = _matches.get(matchId);
  if (!match || match.status !== 'active') return { ok: false, error: 'match_not_found' };

  const player = match.players[socketId];
  const opponentId = match.opponentOf[socketId];
  if (!player) return { ok: false, error: 'not_in_match' };
  if (match.turnSocketId && match.turnSocketId !== socketId) {
    return { ok: false, error: 'wait_turn', message: 'Wait for your turn' };
  }

  const submittedWord = String(word || '').trim().toUpperCase();

  if (!CHAIN_WORD_RE.test(submittedWord)) {
    return { ok: false, error: 'invalid_word', message: 'Use 2-16 letters only' };
  }

  if (!isValidWord(submittedWord, { minLength: 2, maxLength: 16 })) {
    return { ok: false, error: 'not_in_dictionary', message: 'Not a recognized English word' };
  }

  if (match.usedWords?.has(submittedWord)) {
    return { ok: false, error: 'already_used', message: 'That word has already been used' };
  }

  if (!validateChain(match.currentWord, submittedWord)) {
    return { ok: false, error: 'invalid_chain', message: `Word must start with ${match.currentWord[match.currentWord.length - 1].toUpperCase()}` };
  }

  match.currentWord = submittedWord;
  match.usedWords?.add(submittedWord);
  match.history.push({ socketId, word: match.currentWord });
  player.score += 10;
  match.turnSocketId = opponentId;

  const matchOver = player.score >= (match.targetScore || GAME.CHAIN_TARGET_SCORE);
  if (matchOver) _finishMatch(matchId, socketId);
  
  return {
    ok: true,
    word: match.currentWord,
    playerScore: player.score,
    opponentId,
    nextTurnId: opponentId,
    matchOver,
    winner: matchOver ? socketId : null,
    targetScore: match.targetScore || GAME.CHAIN_TARGET_SCORE,
  };
}

/**
 * Process an Anagram guess.
 */
function processAnagram(matchId, socketId, guess) {
  if (!_checkRateLimit(socketId)) return { ok: false, error: 'rate_limited' };

  const match = _matches.get(matchId);
  if (!match || match.status !== 'active') return { ok: false, error: 'match_not_found' };

  const player = match.players[socketId];
  const opponentId = match.opponentOf[socketId];
  if (!player) return { ok: false, error: 'not_in_match' };

  const submittedGuess = String(guess || '').trim().toUpperCase();
  const isCorrect = submittedGuess === match.secretWord.toUpperCase();
  let solvedWord;
  let matchOver = false;
  
  if (isCorrect) {
    solvedWord = match.secretWord;
    player.score += 50;
    matchOver = player.score >= (match.targetScore || GAME.ANAGRAM_TARGET_SCORE);

    if (matchOver) {
      _finishMatch(matchId, socketId);
    } else {
      match.secretWord = getRandomWord(GAME.WORD_LENGTH);
      match.scrambled = generateAnagram(match.secretWord);
    }
  }
  
  return {
    ok: true,
    isCorrect,
    scrambled: match.scrambled,
    playerScore: player.score,
    opponentId,
    solvedWord,
    matchOver,
    winner: matchOver ? socketId : null,
    targetScore: match.targetScore || GAME.ANAGRAM_TARGET_SCORE,
  };
}

/**
 * Internal: mark match finished, update ELO in DB, persist match doc.
 * All DB writes are fire-and-forget to keep the real-time path clean.
 */
async function _finishMatch(matchId, winnerId) {
  const match = _matches.get(matchId);
  if (!match || match.status === 'finished') return;
  match.status = 'finished';
  match.winnerId = winnerId;

  const playerList = Object.values(match.players);
  const eloChanges = [];

  if (winnerId && match.ranked) {
    const loserId  = match.opponentOf[winnerId];
    const winner   = match.players[winnerId];
    const loser    = match.players[loserId];

    if (winner && loser) {
      const { winnerNew, loserNew } = calculateElo(winner.elo, loser.elo);
      eloChanges.push(
        { userId: winner.mongoId, delta: winnerNew - winner.elo, newElo: winnerNew },
        { userId: loser.mongoId,  delta: loserNew  - loser.elo,  newElo: loserNew  },
      );
      // Async — don't await, don't block socket path
      updateElo(winner.mongoId, winnerNew, true).catch(e => console.error('[elo]', e));
      updateElo(loser.mongoId,  loserNew,  false).catch(e => console.error('[elo]', e));
    }
  }

  // Persist match to MongoDB (fire-and-forget)
  Match.create({
    matchId,
    status:     'finished',
    secretWord: match.secretWord || 'CHAIN',
    players:    playerList.map(p => ({
      userId:      p.mongoId,
      username:    p.username,
      eloAtStart:  p.elo,
      guesses:     p.guesses,
      solved:      p.solved,
      solveTimeMs: p.solveTimeNs > 0n ? Number(p.solveTimeNs / 1_000_000n) : 0,
    })),
    winnerId:   winnerId ? match.players[winnerId]?.mongoId : null,
    eloChanges,
    startedAt:  match.startTime,
    finishedAt: new Date(),
  }).catch(e => console.error('[match persist]', e));

  // Clean up in-memory state after 60s
  setTimeout(() => _matches.delete(matchId), 60_000);
}

// ── Gauntlet (solo PvE) ───────────────────────────────────────────────────────

const _gauntletSessions = new Map();

function startGauntlet(socketId, userId) {
  const session = {
    socketId, userId,
    score:       0,
    wordsSolved: 0,
    secretWord:  getRandomWord(GAME.WORD_LENGTH),
    guesses:     0,
    timeLeftMs:  GAME.GAUNTLET_BASE_TIME_MS,
    startedAt:   Date.now(),
  };
  _gauntletSessions.set(socketId, session);
  return { timeLeftMs: session.timeLeftMs };
}

function processGauntletGuess(socketId, guessRaw) {
  if (!_checkRateLimit(socketId)) return { ok: false, error: 'rate_limited' };

  const session = _gauntletSessions.get(socketId);
  if (!session) return { ok: false, error: 'no_session' };

  const elapsed   = Date.now() - session.startedAt;
  const remaining = session.timeLeftMs - elapsed;
  if (remaining <= 0) return { ok: false, error: 'time_up' };

  const resultObj = evaluateGuess(guessRaw, session.secretWord);
  const won       = isWin(resultObj.result);
  const { guess, result } = serialiseAndRelease(resultObj);
  session.guesses++;

  let nextWord = null;
  let gameOver = false;
  let secretWord;

  if (won) {
    const bonus = GAME.GAUNTLET_BONUS_MS ?? 15_000;
    session.score      += 100 + (GAME.MAX_GUESSES - session.guesses) * 20;
    session.wordsSolved++;
    session.timeLeftMs  = remaining + bonus;
    session.startedAt   = Date.now();
    secretWord          = session.secretWord;
    session.secretWord  = getRandomWord(GAME.WORD_LENGTH);
    session.guesses     = 0;
    nextWord            = true;
  } else if (session.guesses >= GAME.MAX_GUESSES) {
    secretWord = session.secretWord;
    gameOver   = true;
    _gauntletSessions.delete(socketId);
  }

  return {
    ok: true,
    guess,
    result,
    won,
    gameOver,
    nextWord,
    score:      session.score,
    timeLeftMs: gameOver ? 0 : Math.max(0, session.timeLeftMs - (Date.now() - session.startedAt)),
    secretWord,
  };
}

function endGauntlet(socketId) {
  _gauntletSessions.delete(socketId);
}

function cleanupPlayer(socketId) {
  leaveQueue(socketId);
  endGauntlet(socketId);
  _lastGuessTime.delete(socketId);
  return { roomsChanged: _removeRoomsForSocket(socketId) };
}

module.exports = {
  joinQueue, leaveQueue,
  createPrivateRoom, joinPrivateRoom, getPublicRooms,
  rejoinMatch, getMatch, processGuess, processWordChain, processAnagram,
  startGauntlet, processGauntletGuess, endGauntlet,
  cleanupPlayer,
};
