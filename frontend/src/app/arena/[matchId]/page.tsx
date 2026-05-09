'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '../../../components/layout/Navbar';
import { Board } from '../../../components/game/Board';
import { GhostBoard } from '../../../components/game/GhostBoard';
import { Keyboard } from '../../../components/game/Keyboard';
import { WordChainUI } from '../../../components/game/WordChainUI';
import { AnagramUI } from '../../../components/game/AnagramUI';
import { HelpModal } from '../../../components/game/HelpModal';
import { ToastContainer } from '../../../components/ui/Toast';
import { useGameStore } from '../../../store/gameStore';
import { useAuthStore } from '../../../store/authStore';
import { connectSocket, getSocket } from '../../../lib/socket';

const WORD_LENGTH = 5;

export default function ArenaPage() {
  const params     = useParams<{ matchId: string }>();
  const router     = useRouter();
  const matchId    = params.matchId;

  const { token }  = useAuthStore();
  const {
    status, guesses, currentGuess, you, opponent,
    opponentProgress, secretWord, winner, shakeRow, mode,
    setCurrentGuess, addGuessResult, addOpponentProgress,
    addToast, setShakeRow, setMatchStart, updateChain, updateAnagram,
  } = useGameStore();

  const [helpOpen, setHelpOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  // ── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = connectSocket(token);

    socket.on('connect', () => {
      setConnected(true);
      if (matchId) socket.emit('rejoin_match', { matchId });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('match_start', (payload) => {
      setMatchStart(payload);
      if (payload.mode === 'anagrams' && payload.scrambled) {
        updateAnagram(payload.scrambled, '', 0, 0);
      } else if (payload.mode === 'word_chain' && payload.currentWord) {
        updateChain(payload.currentWord, 'System', 0, 0);
      }
    });

    socket.on('guess_result', (data) => {
      addGuessResult(data);
      if (data.matchOver) {
        const msg = data.winner === 'you' ? `🎉 You won! Word: ${data.secretWord}` : `💀 You lost! Word: ${data.secretWord}`;
        addToast(msg, data.winner === 'you' ? 'success' : 'error');
      }
    });

    socket.on('opponent_progress', (data) => {
      addOpponentProgress(data);
      if (data.matchOver) {
        const msg = data.winner === 'you' ? `🎉 Opponent solved it — you won! Word: ${data.secretWord}` : `😤 Opponent solved it: ${data.secretWord}`;
        addToast(msg, data.winner === 'you' ? 'success' : 'warn');
      }
    });

    socket.on('chain_update', ({ word, playerScore, lastPlayerId }) => {
      const isYou = lastPlayerId === socket.id;
      const youScore = isYou ? playerScore : useGameStore.getState().scores.you;
      const oppScore = !isYou ? playerScore : useGameStore.getState().scores.opponent;
      const username = isYou ? you?.username : opponent?.username;
      updateChain(word, username || 'Player', youScore, oppScore);
      if (!isYou) addToast(`${username} sent: ${word}`, 'info');
    });

    socket.on('anagram_solved', ({ scrambled, playerScore, lastPlayerId }) => {
      const isYou = lastPlayerId === socket.id;
      const youScore = isYou ? playerScore : useGameStore.getState().scores.you;
      const oppScore = !isYou ? playerScore : useGameStore.getState().scores.opponent;
      const username = isYou ? you?.username : opponent?.username;
      updateAnagram(scrambled, username || 'Player', youScore, oppScore);
      addToast(isYou ? 'Correct! +50 pts' : `${username} solved it!`, isYou ? 'success' : 'warn');
    });

    socket.on('guess_error', (err: { message: string }) => {
      addToast(err.message, 'error');
      if (mode === 'brawl') setShakeRow(guesses.length);
    });

    return () => {
      socket.off('guess_result');
      socket.off('opponent_progress');
      socket.off('chain_update');
      socket.off('anagram_solved');
      socket.off('guess_error');
      socket.off('match_start');
    };
  }, [matchId, token, you?.username, opponent?.username, mode, guesses.length]);

  // ── Input handler ─────────────────────────────────────────────────────────
  const handleKey = useCallback((key: string) => {
    if (status !== 'playing' || mode !== 'brawl') return;
    const socket = getSocket();

    if (key === 'ENTER') {
      if (currentGuess.length < WORD_LENGTH) {
        addToast('Not enough letters', 'warn');
        setShakeRow(guesses.length);
        return;
      }
      socket?.emit('submit_guess', { matchId, guess: currentGuess });
    } else if (key === '⌫' || key === 'BACKSPACE') {
      setCurrentGuess(currentGuess.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
      setCurrentGuess(currentGuess + key);
    }
  }, [status, currentGuess, guesses.length, matchId, mode]);

  const isOver = status === 'won' || status === 'lost';

  const renderGame = () => {
    switch (mode) {
      case 'word_chain': return <WordChainUI matchId={matchId} />;
      case 'anagrams':   return <AnagramUI matchId={matchId} />;
      case 'brawl':
      default:
        return (
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 280 }}>
              <p className="font-hand" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--wb-ink)', marginBottom: 12 }}>Your Board</p>
              <Board guesses={guesses} currentGuess={status === 'playing' ? currentGuess : ''} shakeRow={shakeRow} />
              <Keyboard guesses={guesses} onKey={handleKey} disabled={status !== 'playing'} />
            </div>
            <div style={{ paddingTop: 40 }}>
              <GhostBoard progress={opponentProgress} label={`👻 ${opponent?.username ?? 'Opponent'}`} guessCount={opponentProgress.length} />
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <ToastContainer />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} mode="arena" />

      <main style={{ flex: 1, padding: '24px 16px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="wb-card" style={{ padding: '8px 20px' }}>
            <span className="font-hand" style={{ fontSize: '1.2rem', color: 'var(--wb-ink)' }}>
              👤 {you?.username ?? '…'} <span style={{ color: 'var(--wb-blue)' }}>({you?.elo ?? '—'} ELO)</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: isOver ? (winner === 'you' ? 'var(--wb-correct)' : 'var(--wb-amber)') : 'var(--wb-ink)' }}>
              {isOver ? (winner === 'you' ? '🏆 You Won!' : '💀 You Lost') : '⚔️ VS'}
            </span>
            <button className="wb-btn wb-btn-sm" onClick={() => setHelpOpen(true)}>?</button>
          </div>
          <div className="wb-card" style={{ padding: '8px 20px' }}>
            <span className="font-hand" style={{ fontSize: '1.2rem', color: 'var(--wb-ink)' }}>
              👤 {opponent?.username ?? '…'} <span style={{ color: 'var(--wb-amber)' }}>({opponent?.elo ?? '—'} ELO)</span>
            </span>
          </div>
        </div>

        {!connected && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span className="font-hand" style={{ color: 'var(--wb-amber)', fontSize: '1.1rem' }}>⚠️ Reconnecting…</span>
          </div>
        )}

        {renderGame()}

        {isOver && secretWord && mode === 'brawl' && (
          <motion.div className="wb-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: 24, marginTop: 32, maxWidth: 480, margin: '32px auto 0' }}>
            <p className="font-hand" style={{ fontSize: '1.3rem', color: 'var(--wb-ink-light)', marginBottom: 8 }}>The word was:</p>
            <p className="font-hand" style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--wb-ink)', letterSpacing: 4 }}>{secretWord}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <button className="wb-btn wb-btn-primary" onClick={() => router.push('/')}>Play Again</button>
              <button className="wb-btn" onClick={() => router.push('/leaderboard')}>Leaderboard</button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
