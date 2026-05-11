'use strict';

const jwt          = require('jsonwebtoken');
const { JWT_SECRET, GAME } = require('../config');
const { isValidWord }      = require('../data/words');
const matchService         = require('../services/matchService');
const authService          = require('../services/authService');
const scribbl              = require('../services/scribblService');

/**
 * Initialises all Socket.io middleware and event handlers.
 *
 * Auth flow:
 *  1. JWT verified in middleware (once per connection).
 *  2. User document fetched from MongoDB and attached to socket.data.user.
 *     This ensures we have the current ELO and the MongoDB _id for ELO updates.
 *  3. Guest sockets (no token) are allowed with socket.data.user = null.
 *     Guests can play Gauntlet but not ranked.
 *
 * HPC notes:
 *  - Auth resolved once at connect-time — zero per-event auth overhead.
 *  - All match state lookups are O(1) Map operations in matchService.
 *  - DB writes are fire-and-forget; the real-time path never awaits I/O.
 */
function initSocket(io) {

  // ── Socket auth middleware ────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.data.user = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      
      if (payload.sub && payload.sub.startsWith('guest_')) {
        // Guest user — skip DB lookup
        socket.data.user = { id: payload.sub, username: payload.username, elo: 1000, isGuest: true };
      } else {
        // Registered user — fetch fresh from MongoDB so ELO is current
        const user = await authService.getUserById(payload.sub);
        socket.data.user = user ?? null;
      }
      next();
    } catch {
      // Treat bad token as guest — don't reject, just downgrade
      socket.data.user = null;
      next();
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  let onlineCount = 0;

  io.on('connection', (socket) => {
    onlineCount++;
    const user = socket.data.user;
    console.log(`[socket] connect  ${socket.id}  user=${user?.username ?? 'guest'} (Online: ${onlineCount})`);

    // Broadcast presence update
    io.emit('presence_update', { onlineCount });

    socket.on('request_presence', () => {
      socket.emit('presence_update', { onlineCount });
    });

    // ── Helper: Start Match ───────────────────────────────────────────────
    const startMatch = (result) => {
      const { matchId, p1, p2, mode, ranked } = result;
      const match = matchService.getMatch(matchId);
      io.sockets.sockets.get(p1.socketId)?.join(matchId);
      io.sockets.sockets.get(p2.socketId)?.join(matchId);

      const payload = {
        matchId,
        mode:       mode || match?.mode || GAME.MODES.BRAWL,
        you:        null, // set per player
        opponent:   null, // set per player
        wordLength: GAME.WORD_LENGTH,
        maxGuesses: GAME.MAX_GUESSES,
        scrambled:  match?.scrambled,
        currentWord: match?.currentWord,
        targetScore: match?.targetScore,
        endsAt:     match?.endsAt,
        nextTurnId: match?.turnSocketId,
        ranked:     Boolean(ranked || match?.ranked),
      };

      if (!payload.ranked) {
        io.to(p1.socketId).emit('room_player_joined', {
          username: p2.username,
          message: `${p2.username} joined the room. Starting the game...`,
        });
        io.to(p2.socketId).emit('room_player_joined', {
          username: p1.username,
          message: `Joined ${p1.username}'s room. Starting the game...`,
        });
      }

      io.to(p1.socketId).emit('match_start', { ...payload, you: { username: p1.username, elo: p1.elo }, opponent: { username: p2.username, elo: p2.elo } });
      io.to(p2.socketId).emit('match_start', { ...payload, you: { username: p2.username, elo: p2.elo }, opponent: { username: p1.username, elo: p1.elo } });

      if (match?.endsAt) {
        setTimeout(() => {
          const latest = matchService.getMatch(matchId);
          if (!latest || latest.status !== 'finished' || latest.notifiedOver) return;
          latest.notifiedOver = true;
          io.to(matchId).emit('match_over', {
            winnerSocketId: latest.winnerId || null,
            winnerName: latest.winnerId ? latest.players[latest.winnerId]?.username : null,
            mode: latest.mode,
            secretWord: latest.secretWord,
          });
        }, Math.max(0, match.endsAt - Date.now() + 3000));
      }
    };

    // ── Matchmaking ────────────────────────────────────────────────────────
    socket.on('join_queue', ({ mode } = {}) => {
      if (!user) return socket.emit('error_event', 'Login required for ranked matches');
      const result = matchService.joinQueue(socket.id, user, mode);
      if (!result) return socket.emit('queue_joined', { position: 'waiting' });
      startMatch(result);
    });

    socket.on('leave_queue', () => {
      matchService.leaveQueue(socket.id);
      socket.emit('queue_left');
    });

    // ── Private & Public Rooms ─────────────────────────────────────────────
    socket.on('create_private_room', ({ mode, visibility } = {}) => {
      if (!user) return socket.emit('error_event', 'Login required to host');
      const room = matchService.createPrivateRoom(socket.id, user, mode, visibility || 'private');
      socket.emit('private_room_created', room);
      
      // Notify all clients of updated lobbies
      if (room.visibility === 'public') io.emit('lobbies_update', matchService.getPublicRooms());

      // Optional: Set a specific timeout here if you want to notify the host
      setTimeout(() => {
        socket.emit('room_expired', { roomCode: room.roomCode });
      }, (GAME.PRIVATE_ROOM_EXPIRE_MS || 300_000) + 1000);
    });

    socket.on('get_public_rooms', () => {
      socket.emit('lobbies_update', matchService.getPublicRooms());
    });

    socket.on('join_public_room', ({ roomCode } = {}) => {
      if (!user) return socket.emit('error_event', 'Login required to join');
      const result = matchService.joinPrivateRoom(roomCode, socket.id, user);
      if (result.error) return socket.emit('error_event', result.error);
      
      if (result.isHost || result.isGuest) {
        return socket.emit('private_room_created', { roomCode, expiresAt: result.room.expires });
      }

      startMatch(result);
      // Remove from public lobbies display
      io.emit('lobbies_update', matchService.getPublicRooms());
    });

    socket.on('join_private_room', ({ roomCode } = {}) => {
      if (!user) return socket.emit('error_event', 'Login required to join');
      const result = matchService.joinPrivateRoom(roomCode, socket.id, user);
      if (result.error) return socket.emit('error_event', result.error);

      if (result.isHost || result.isGuest) {
        return socket.emit('private_room_created', { roomCode, expiresAt: result.room.expires });
      }

      startMatch(result);
    });

    socket.on('rejoin_match', ({ matchId }) => {
      if (!user) return socket.emit('error_event', 'Login required');
      const res = matchService.rejoinMatch(matchId, socket.id, user.id);
      if (res.error) return socket.emit('error_event', res.error);

      socket.join(matchId);
      
      // Send match_start with CURRENT state to the rejoining player
      const match = res.match;
      const opponentSocketId = match.opponentOf[socket.id];
      const opponent = match.players[opponentSocketId];
      const you = match.players[socket.id];

      socket.emit('match_start', {
        matchId,
        mode: match.mode,
        you: { username: you.username, elo: you.elo },
        opponent: { username: opponent.username, elo: opponent.elo },
        wordLength: GAME.WORD_LENGTH,
        maxGuesses: GAME.MAX_GUESSES,
        scrambled: match.scrambled,
        currentWord: match.currentWord,
        targetScore: match.targetScore,
        endsAt: match.endsAt,
        nextTurnId: match.turnSocketId,
      });

      // Also send current progress if any
      if (match.mode === 'brawl') {
        // ... could send history here
      }
    });

    // ── Guess submission (1v1) ─────────────────────────────────────────────
    socket.on('submit_guess', ({ matchId, guess }) => {
      if (typeof guess !== 'string') return;
      const g = guess.toUpperCase().trim();
      if (g.length !== GAME.WORD_LENGTH) return socket.emit('guess_error', { code: 'invalid_length', message: 'Word must be 5 letters' });
      if (!isValidWord(g, { minLength: GAME.WORD_LENGTH, maxLength: GAME.WORD_LENGTH })) {
        return socket.emit('guess_error', { code: 'not_in_dictionary', message: 'Not a recognized English word' });
      }

      const res = matchService.processGuess(matchId, socket.id, g);
      if (!res.ok) return socket.emit('guess_error', { code: res.error, message: res.error });

      socket.emit('guess_result', {
        guess: res.guess, result: res.result, guessNumber: res.guessNumber,
        won: res.won, matchOver: res.matchOver,
        winner: res.matchOver ? (res.winner === socket.id ? 'you' : 'opponent') : null,
        secretWord: res.secretWord,
      });

      socket.to(matchId).emit('opponent_progress', {
        result: res.result, guessNumber: res.guessNumber, matchOver: res.matchOver,
        winner: res.matchOver ? (res.winner === res.opponentId ? 'you' : 'opponent') : null,
        secretWord: res.secretWord,
      });
    });

    // ── Word Chain ────────────────────────────────────────────────────────
    socket.on('submit_chain_word', ({ matchId, word }) => {
      if (!word) return;
      const submittedWord = String(word).trim().toUpperCase();

      const res = matchService.processWordChain(matchId, socket.id, submittedWord);
      if (!res.ok) return socket.emit('guess_error', { code: res.error, message: res.message || res.error });

      io.to(matchId).emit('chain_update', {
        word: res.word,
        playerScore: res.playerScore,
        lastPlayerId: socket.id,
        nextTurnId: res.nextTurnId,
        targetScore: res.targetScore,
        matchOver: res.matchOver,
        winner: res.matchOver ? (res.winner === socket.id ? 'you' : 'opponent') : null,
      });

      if (res.matchOver) {
        const match = matchService.getMatch(matchId);
        if (match) match.notifiedOver = true;
        io.to(matchId).emit('match_over', {
          winnerSocketId: res.winner,
          winnerName: user.username,
          mode: GAME.MODES.WORD_CHAIN,
        });
      }
    });

    // ── Anagrams ──────────────────────────────────────────────────────────
    socket.on('submit_anagram_guess', ({ matchId, guess }) => {
      if (!guess) return;
      const res = matchService.processAnagram(matchId, socket.id, guess);
      if (!res.ok) return socket.emit('guess_error', { code: res.error, message: res.error });

      if (res.isCorrect) {
        io.to(matchId).emit('anagram_solved', {
          scrambled: res.scrambled,
          playerScore: res.playerScore,
          lastPlayerId: socket.id,
          solvedWord: res.solvedWord,
          targetScore: res.targetScore,
          matchOver: res.matchOver,
          winner: res.matchOver ? (res.winner === socket.id ? 'you' : 'opponent') : null,
        });

        if (res.matchOver) {
          const match = matchService.getMatch(matchId);
          if (match) match.notifiedOver = true;
          io.to(matchId).emit('match_over', {
            winnerSocketId: res.winner,
            winnerName: user.username,
            mode: GAME.MODES.ANAGRAMS,
            secretWord: res.solvedWord,
          });
        }
      } else {
        socket.emit('guess_error', { code: 'wrong_anagram', message: 'Not quite!' });
      }
    });

    // ── Gauntlet (solo PvE) ────────────────────────────────────────────────
    socket.on('gauntlet_start', () => {
      const sess = matchService.startGauntlet(socket.id, user?.id ?? 'guest');
      socket.emit('gauntlet_started', { timeLeftMs: sess.timeLeftMs, wordLength: GAME.WORD_LENGTH, maxGuesses: GAME.MAX_GUESSES });
    });

    socket.on('gauntlet_guess', ({ guess }) => {
      if (typeof guess !== 'string') return;
      const g = guess.toUpperCase().trim();
      if (g.length !== GAME.WORD_LENGTH) return socket.emit('guess_error', { code: 'invalid_length', message: 'Word must be 5 letters' });
      if (!isValidWord(g, { minLength: GAME.WORD_LENGTH, maxLength: GAME.WORD_LENGTH })) {
        return socket.emit('guess_error', { code: 'not_in_dictionary', message: 'Not a recognized English word' });
      }

      const res = matchService.processGauntletGuess(socket.id, g);
      if (!res.ok) return socket.emit('guess_error', { code: res.error, message: res.error });
      socket.emit('gauntlet_result', res);
    });

    socket.on('gauntlet_end', () => matchService.endGauntlet(socket.id));

    // ── Scribbl: Lobby Management ──────────────────────────────────────────
    socket.on('scribbl_create_lobby', ({ rounds, maxPlayers, visibility }) => {
      if (!user) return socket.emit('error_event', 'Login required');
      const { lobbyId, lobby } = scribbl.createLobby(socket.id, user.id, user.username, { rounds, maxPlayers, visibility });
      socket.join(lobbyId);
      socket.emit('scribbl_lobby_joined', { lobbyId, lobby, isHost: true });
      if (visibility === 'public') io.emit('scribbl_lobbies_update', scribbl.getPublicLobbies());
    });

    socket.on('scribbl_join_lobby', ({ lobbyId }) => {
      if (!user) return socket.emit('error_event', 'Login required');
      const res = scribbl.joinLobby(lobbyId, socket.id, user.id, user.username);
      if (res.error) return socket.emit('error_event', res.error);
      socket.join(lobbyId);
      const isHost = res.lobby.players.find(p => p.socketId === socket.id)?.isHost || false;
      socket.emit('scribbl_lobby_joined', { lobbyId, lobby: res.lobby, isHost });
      socket.to(lobbyId).emit('scribbl_player_joined', { lobby: res.lobby, username: user.username });
      io.emit('scribbl_lobbies_update', scribbl.getPublicLobbies());
    });

    socket.on('scribbl_get_lobbies', () => {
      socket.emit('scribbl_lobbies_update', scribbl.getPublicLobbies());
    });

    socket.on('scribbl_start_game', ({ lobbyId }) => {
      const turnInfo = scribbl.startGame(lobbyId, socket.id);
      if (turnInfo.error) return socket.emit('error_event', turnInfo.error);
      io.emit('scribbl_lobbies_update', scribbl.getPublicLobbies());
      _broadcastTurn(lobbyId, turnInfo);
    });

    // ── Scribbl: Drawing ───────────────────────────────────────────────────
    socket.on('scribbl_draw', ({ lobbyId, stroke }) => {
      if (!scribbl.isDrawer(lobbyId, socket.id)) return;
      if (!scribbl.canDraw(socket.id)) return;
      socket.to(lobbyId).emit('scribbl_draw', { stroke });
    });

    socket.on('scribbl_clear', ({ lobbyId }) => {
      if (!scribbl.isDrawer(lobbyId, socket.id)) return;
      io.to(lobbyId).emit('scribbl_clear');
    });

    // ── Scribbl: Chat / Word Detection ────────────────────────────────────
    socket.on('scribbl_chat', ({ lobbyId, message }) => {
      if (!message || typeof message !== 'string') return;
      const msg = message.slice(0, 100).trim();
      const res = scribbl.handleChat(lobbyId, socket.id, msg);
      if (!res.ok) return;

      if (res.solved) {
        // Private message — only the solver sees "You got it!"
        socket.emit('scribbl_solved', { scoreDelta: res.scoreDelta, scores: res.scores });
        // Tell everyone someone solved (no word reveal)
        io.to(lobbyId).emit('scribbl_chat_msg', { sender: res.sender, message: `🎉 ${res.sender} guessed the word!`, system: true, scores: res.scores });

        if (res.allSolved) {
          // Everyone solved — end turn early
          const turnEnd = scribbl.endTurnEarly(lobbyId);
          if (turnEnd) {
            io.to(lobbyId).emit('scribbl_turn_end', turnEnd);
            if (!turnEnd.gameOver) {
              setTimeout(() => {
                const nextTurn = scribbl.nextTurn(lobbyId);
                if (nextTurn) _broadcastTurn(lobbyId, nextTurn);
              }, turnEnd.nextTurnIn || 3000);
            }
          }
        }
      } else {
        io.to(lobbyId).emit('scribbl_chat_msg', { sender: res.sender, message: res.message, system: false });
      }
    });

    // ── Scribbl: Turn helper ───────────────────────────────────────────────
    function _broadcastTurn(lobbyId, turnInfo) {
      const { secretWord, drawer, ...shared } = turnInfo;
      // Broadcast to everyone (including drawer) with hint
      io.to(lobbyId).emit('scribbl_turn_start', { ...shared, drawer });
      // Send secret word ONLY to the drawer
      const drawerSocket = io.sockets.sockets.get(drawer);
      drawerSocket?.emit('scribbl_drawer_word', { secretWord });
    }


    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineCount = Math.max(0, onlineCount - 1);
      console.log(`[socket] disconnect ${socket.id} (Online: ${onlineCount})`);
      io.emit('presence_update', { onlineCount });
      const cleanup = matchService.cleanupPlayer(socket.id);
      if (cleanup?.roomsChanged) io.emit('lobbies_update', matchService.getPublicRooms());

      // Scribbl cleanup
      const lobbyId = scribbl.getSocketLobby(socket.id);
      if (lobbyId) {
        const result = scribbl.leaveLobby(socket.id);
        if (result) {
          if (result.disbanded) {
            io.to(lobbyId).emit('scribbl_lobby_disbanded');
          } else {
            io.to(lobbyId).emit('scribbl_player_left', { lobby: result.lobby, username: result.username });
          }
          io.emit('scribbl_lobbies_update', scribbl.getPublicLobbies());
        }
      }
    });
  });
}

module.exports = { initSocket };
