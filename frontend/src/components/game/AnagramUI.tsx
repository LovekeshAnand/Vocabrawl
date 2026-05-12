'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { getSocket } from '../../lib/socket';

export function AnagramUI({ matchId, disabled = false }: { matchId: string; disabled?: boolean }) {
  const { scrambledWord, scores, you, opponent, targetScore, endsAt } = useGameStore();
  const [input, setInput] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [endsAt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || disabled) return;
    const socket = getSocket();
    socket?.emit('submit_anagram_guess', { matchId, guess: input.toUpperCase().trim() });
    setInput('');
  };

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div className="wb-card" style={{ padding: '12px 24px', textAlign: 'center', flex: '1 1 180px' }}>
          <p className="font-hand" style={{ fontSize: '1.2rem' }}>{you?.username}</p>
          <p className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--wb-blue)' }}>{scores.you}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--wb-ink-faint)' }}>Target {targetScore ?? 250}</p>
        </div>
        <div className="wb-card" style={{ padding: '12px 24px', textAlign: 'center', flex: '1 1 180px' }}>
          <p className="font-hand" style={{ fontSize: '1.2rem' }}>{opponent?.username}</p>
          <p className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--wb-red)' }}>{scores.opponent}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--wb-ink-faint)' }}>{secondsLeft !== null ? `${secondsLeft}s left` : 'Speed round'}</p>
        </div>
      </div>

      <div className="wb-card" style={{ padding: 40, textAlign: 'center', marginBottom: 32 }}>
        <p className="font-hand" style={{ fontSize: '1.5rem', color: 'var(--wb-ink-light)', marginBottom: 8 }}>Unscramble this:</p>
        <AnimatePresence mode="wait">
          <motion.h2 
            key={scrambledWord}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="font-hand" 
            style={{ fontSize: 'clamp(2rem, 12vw, 4.5rem)', fontWeight: 700, color: 'var(--wb-ink)', letterSpacing: 'clamp(2px, 2vw, 8px)', textTransform: 'uppercase' }}
          >
            {scrambledWord || '...'}
          </motion.h2>
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input 
          type="text" 
          className="wb-input" 
          placeholder="Type your answer..."
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          disabled={disabled}
          autoFocus
        />
        <button type="submit" className="wb-btn wb-btn-primary" disabled={disabled}>Solve!</button>
      </form>

      <div style={{ textAlign: 'center', color: 'var(--wb-ink-faint)' }}>
        <p className="font-hand" style={{ fontSize: '1.1rem' }}>{disabled ? 'Match complete' : 'First to solve each scramble gets 50 points.'}</p>
      </div>
    </div>
  );
}
