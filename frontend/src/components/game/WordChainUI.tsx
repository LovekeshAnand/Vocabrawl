'use client';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { getSocket } from '../../lib/socket';

export function WordChainUI({ matchId }: { matchId: string }) {
  const { currentChainWord, chainHistory, scores, you, opponent, addToast } = useGameStore();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;
    const socket = getSocket();
    socket?.emit('submit_chain_word', { matchId, word: input.toUpperCase().trim() });
    setInput('');
  };

  const lastChar = currentChainWord ? currentChainWord[currentChainWord.length - 1].toUpperCase() : '?';

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="wb-card" style={{ padding: '12px 24px', textAlign: 'center', flex: 1, marginRight: 12 }}>
          <p className="font-hand" style={{ fontSize: '1.2rem' }}>{you?.username}</p>
          <p className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--wb-indigo)' }}>{scores.you}</p>
        </div>
        <div className="wb-card" style={{ padding: '12px 24px', textAlign: 'center', flex: 1, marginLeft: 12 }}>
          <p className="font-hand" style={{ fontSize: '1.2rem' }}>{opponent?.username}</p>
          <p className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--wb-amber)' }}>{scores.opponent}</p>
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
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input 
          type="text" 
          className="wb-input" 
          placeholder={`Enter a word starting with ${lastChar}...`}
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          autoFocus
        />
        <button type="submit" className="wb-btn wb-btn-primary">Send</button>
      </form>

      <div className="wb-card" style={{ padding: 24 }}>
        <h3 className="font-hand" style={{ fontSize: '1.5rem', marginBottom: 16, borderBottom: '1.5px dashed var(--wb-grid)' }}>History</h3>
        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: 8 }}>
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
