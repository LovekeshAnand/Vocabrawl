'use client';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { LetterState } from '../../types/game';

const STATE_CLASS: Record<number, string> = { 0: 'absent', 1: 'present', 2: 'correct' };
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

interface BoardProps {
  guesses: { guess: string; result: LetterState[]; guessNumber: number; won: boolean; matchOver: boolean; winner: 'you' | 'opponent' | null }[];
  currentGuess: string;
  shakeRow: number | null;
}

export function Board({ guesses, currentGuess, shakeRow }: BoardProps) {
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (i < guesses.length) {
      const g = guesses[i];
      return (
        <motion.div key={i} style={{ display: 'flex', gap: 8 }}
          animate={shakeRow === i ? { x: [-6, 6, -4, 4, 0], transition: { duration: 0.5 } } : {}}>
          {g.result.map((state, j) => (
            <motion.div key={j}
              className={`wb-tile ${state !== null ? STATE_CLASS[state as number] : ''}`}
              animate={state !== null ? { scaleY: [1, 0, 1] } : {}}
              transition={{ delay: j * 0.08, duration: 0.45 }}>
              {g.guess[j] ?? ''}
            </motion.div>
          ))}
        </motion.div>
      );
    } else if (i === guesses.length) {
      const letters = currentGuess.padEnd(WORD_LENGTH, ' ').split('');
      return (
        <motion.div key={i} style={{ display: 'flex', gap: 8 }}
          animate={shakeRow === i ? { x: [-6, 6, -4, 4, 0], transition: { duration: 0.5 } } : {}}>
          {letters.map((l, j) => (
            <motion.div key={j} className={`wb-tile ${l.trim() ? 'has-letter' : ''}`}
              animate={l.trim() ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.1 }}>
              {l.trim()}
            </motion.div>
          ))}
        </motion.div>
      );
    } else {
      return (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: WORD_LENGTH }).map((_, j) => <div key={j} className="wb-tile" />)}
        </div>
      );
    }
  });

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{rows}</div>;
}
