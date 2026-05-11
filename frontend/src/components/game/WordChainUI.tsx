'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { getSocket } from '../../lib/socket';

export function WordChainUI({ matchId, socketId, disabled = false }: { matchId: string; socketId: string | null; disabled?: boolean }) {
  const { currentChainWord, chainHistory, scores, you, opponent, targetScore, endsAt, nextTurnId, addToast } = useGameStore();
  const [input, setInput] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [endsAt]);

  useEffect(() => {
    const history = historyRef.current;
    if (!history) return;
    history.scrollTop = history.scrollHeight;
  }, [chainHistory.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || disabled) return;
    if (nextTurnId && socketId && nextTurnId !== socketId) {
      addToast('Wait for your turn', 'warn');
      return;
    }
    const socket = getSocket();
    socket?.emit('submit_chain_word', { matchId, word: input.toUpperCase().trim() });
    setInput('');
  };

  const lastChar = currentChainWord ? currentChainWord[currentChainWord.length - 1].toUpperCase() : '?';
  const isYourTurn = !nextTurnId || !socketId || nextTurnId === socketId;

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="wb-card" style={{ padding: '12px 24px', textAlign: 'center', flex: 1, marginRight: 12 }}>
          <p className="font-hand" style={{ fontSize: '1.2rem' }}>{you?.username}</p>
          <p className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--wb-indigo)' }}>{scores.you}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--wb-ink-faint)' }}>Target {targetScore ?? 100}</p>
        </div>
        <div className="wb-card" style={{ padding: '12px 24px', textAlign: 'center', flex: 1, marginLeft: 12 }}>
          <p className="font-hand" style={{ fontSize: '1.2rem' }}>{opponent?.username}</p>
          <p className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--wb-amber)' }}>{scores.opponent}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--wb-ink-faint)' }}>{secondsLeft !== null ? `${secondsLeft}s left` : 'Live duel'}</p>
        </div>
      </div>

      <div className="wb-card" style={{ padding: 40, textAlign: 'center', marginBottom: 32 }}>
        <p className="font-hand" style={{ fontSize: '1.5rem', color: 'var(--wb-ink-light)', marginBottom: 8 }}>Current Word:</p>
        <h2 className="font-hand" style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--wb-ink)', letterSpacing: 2 }}>
          {currentChainWord || '...'}
        </h2>
        <div style={{ marginTop: 16 }}>
          <span className="font-hand" style={{ fontSize: '1.2rem', padding: '4px 12px', background: 'var(--wb-paper-alt)', borderRadius: 20, border: '1.5px solid var(--wb-border)' }}>
            Next word starts with: <strong style={{ color: 'var(--wb-blue)', fontSize: '1.5rem' }}>{lastChar}</strong>
          </span>
        </div>
        <p className="font-hand" style={{ marginTop: 16, fontSize: '1.2rem', color: isYourTurn ? 'var(--wb-correct)' : 'var(--wb-amber)' }}>
          {disabled ? 'Match complete' : isYourTurn ? 'Your turn' : `${opponent?.username || 'Opponent'} is thinking...`}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input 
          type="text" 
          className="wb-input" 
          placeholder={`Enter a word starting with ${lastChar}...`}
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          disabled={disabled || !isYourTurn}
          autoFocus
        />
        <button type="submit" className="wb-btn wb-btn-primary" disabled={disabled || !isYourTurn}>Send</button>
      </form>

      <div className="wb-card" style={{ padding: 24 }}>
        <h3 className="font-hand" style={{ fontSize: '1.5rem', marginBottom: 16, borderBottom: '1.5px dashed var(--wb-grid)' }}>History</h3>
        <div
          ref={historyRef}
          style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 6 }}
        >
          <AnimatePresence initial={false}>
            {chainHistory.map((entry, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}
              >
                <span className="font-hand" style={{ color: entry.username === you?.username ? 'var(--wb-blue)' : 'var(--wb-ink)' }}>
                  {entry.username}: <strong>{entry.word}</strong>
                </span>
                <span style={{ color: 'var(--wb-correct)', fontSize: '0.9rem' }}>+10 pts</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
