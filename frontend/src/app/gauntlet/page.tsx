'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { Board } from '../../components/game/Board';
import { Keyboard } from '../../components/game/Keyboard';
import { HelpModal } from '../../components/game/HelpModal';
import { ToastContainer } from '../../components/ui/Toast';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { connectSocket, getSocket } from '../../lib/socket';
import { GauntletResult } from '../../types/game';

const WORD_LENGTH = 5;

export default function GauntletPage() {
  const { token } = useAuthStore();
  const {
    gauntletStatus, gauntletScore, gauntletTime,
    gauntletGuesses, gauntletCurrentGuess,
    setGauntletStarted, setGauntletCurrentGuess,
    addGauntletResult, addToast, resetGauntlet,
  } = useGameStore();

  const [helpOpen, setHelpOpen]   = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTs  = useRef<number>(0);
  const baseTime = useRef<number>(0);

  // Live countdown timer
  useEffect(() => {
    if (gauntletStatus === 'playing') {
      startTs.current = Date.now();
      baseTime.current = gauntletTime;
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTs.current;
        const remaining = Math.max(0, baseTime.current - elapsed);
        setDisplayTime(remaining);
        if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gauntletStatus, gauntletTime]);

  const startGauntlet = () => {
    if (!token) {
      addToast('Please login to track your score!', 'warn');
      return;
    }
    resetGauntlet();
    const socket = connectSocket(token);
    socket.on('gauntlet_started', (data: { timeLeftMs: number }) => {
      setGauntletStarted(data.timeLeftMs);
    });
    socket.on('gauntlet_result', (data: GauntletResult) => {
      addGauntletResult(data);
      if (data.won) addToast(`✅ Solved! +${data.score} pts — next word!`, 'success');
      if (data.gameOver) addToast(`💀 Game over! Final score: ${data.score}`, 'error');
    });
    socket.on('guess_error', (err: { message: string }) => {
      addToast(err.message, 'error');
    });
    socket.emit('gauntlet_start');
  };

  const handleKey = useCallback((key: string) => {
    if (gauntletStatus !== 'playing') return;
    const socket = getSocket();
    if (key === 'ENTER') {
      if (gauntletCurrentGuess.length < WORD_LENGTH) { addToast('Not enough letters', 'warn'); return; }
      socket?.emit('gauntlet_guess', { guess: gauntletCurrentGuess });
    } else if (key === '⌫') {
      setGauntletCurrentGuess(gauntletCurrentGuess.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && gauntletCurrentGuess.length < WORD_LENGTH) {
      setGauntletCurrentGuess(gauntletCurrentGuess + key);
    }
  }, [gauntletStatus, gauntletCurrentGuess]);

  const secs = Math.ceil(displayTime / 1000);
  const pct  = Math.min(100, (displayTime / 60000) * 100);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ToastContainer />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} mode="gauntlet" />

      <main style={{ flex: 1, padding: '24px 16px', maxWidth: 700, margin: '0 auto', width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 className="font-hand" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--wb-ink)' }}>🏃 The Gauntlet</h1>
          <button className="wb-btn wb-btn-sm" onClick={() => setHelpOpen(true)}>?</button>
        </div>

        {/* Stats bar */}
        {gauntletStatus !== 'idle' && (
          <div className="wb-card" style={{ padding: '16px 24px', marginBottom: 24, display: 'flex', gap: 32, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--wb-ink-faint)', marginBottom: 2 }}>SCORE</p>
              <p className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--wb-ink)' }}>{gauntletScore}</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--wb-ink-faint)', marginBottom: 6 }}>
                TIME — <span className="font-hand" style={{ fontSize: '1.1rem', color: secs < 10 ? 'var(--wb-red)' : 'var(--wb-ink)' }}>{secs}s</span>
              </p>
              <div className="wb-progress-track">
                <motion.div className="wb-progress-fill" style={{ width: `${pct}%`, background: secs < 10 ? 'var(--wb-red)' : 'var(--wb-ink)' }} />
              </div>
            </div>
          </div>
        )}

        {/* Idle state */}
        {gauntletStatus === 'idle' && (
          <div className="wb-card" style={{ textAlign: 'center', padding: '60px 32px' }}>
            <p style={{ fontSize: '4rem', marginBottom: 16 }}>🏃</p>
            <h2 className="font-hand" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--wb-ink)', marginBottom: 12 }}>
              Ready to Brawl Solo?
            </h2>
            <p style={{ color: 'var(--wb-ink-light)', marginBottom: 32 }}>
              60 seconds. Unlimited words. Each solve adds 15s. Run out of guesses and it&apos;s over.
            </p>
            <button className="wb-btn wb-btn-primary wb-btn-lg" onClick={startGauntlet}>
              🚀 Start Gauntlet
            </button>
          </div>
        )}

        {/* Game over */}
        {gauntletStatus === 'over' && (
          <motion.div className="wb-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '48px 32px' }}
          >
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>💀</p>
            <h2 className="font-hand" style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--wb-ink)', marginBottom: 8 }}>Game Over!</h2>
            <p className="font-hand" style={{ fontSize: '1.5rem', color: 'var(--wb-ink-light)', marginBottom: 24 }}>
              Final Score: <strong style={{ color: 'var(--wb-ink)', fontSize: '2.5rem' }}>{gauntletScore}</strong>
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="wb-btn wb-btn-primary" onClick={startGauntlet}>Play Again</button>
              <button className="wb-btn" onClick={() => window.location.href = '/leaderboard'}>Leaderboard</button>
            </div>
          </motion.div>
        )}

        {/* Active game */}
        {gauntletStatus === 'playing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Board guesses={gauntletGuesses} currentGuess={gauntletCurrentGuess} shakeRow={null} />
            <Keyboard guesses={gauntletGuesses} onKey={handleKey} />
          </div>
        )}
        {/* Info Section */}
        {gauntletStatus === 'idle' && (
          <div style={{ marginTop: 40 }}>
            <h2 className="font-hand" style={{ fontSize: '2rem', marginBottom: 20 }}>Gauntlet Rules</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="wb-card" style={{ padding: 24 }}>
                <h4 style={{ fontWeight: 700, marginBottom: 12 }}>⚡ Speed is Survival</h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--wb-ink-light)', lineHeight: 1.5 }}>
                  The timer never stops. Every word you solve adds 15 seconds to your clock. Move fast, think faster!
                </p>
              </div>
              <div className="wb-card" style={{ padding: 24 }}>
                <h4 style={{ fontWeight: 700, marginBottom: 12 }}>🎯 No Room for Error</h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--wb-ink-light)', lineHeight: 1.5 }}>
                  You have 6 guesses per word. If you fail to solve a word, the run ends instantly, regardless of time left.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
