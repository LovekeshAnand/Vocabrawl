'use client';
import { useEffect } from 'react';
import { LetterState } from '../../types/game';

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

interface KeyboardProps {
  guesses: { guess: string; result: LetterState[] }[];
  onKey: (key: string) => void;
  disabled?: boolean;
}

export function Keyboard({ guesses, onKey, disabled = false }: KeyboardProps) {
  const keyStates: Record<string, number> = {};
  guesses.forEach(g => {
    g.guess.split('').forEach((letter, i) => {
      const state = g.result[i] as number | null;
      if (state === null || state === undefined) return;
      const cur = keyStates[letter] ?? -1;
      if (state > cur) keyStates[letter] = state;
    });
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter') onKey('ENTER');
      else if (e.key === 'Backspace') onKey('⌫');
      else if (/^[a-zA-Z]$/.test(e.key)) onKey(e.key.toUpperCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey, disabled]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', alignItems: 'center', marginTop: 24 }}>
      {ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 6, width: '100%', justifyContent: 'center' }}>
          {row.map(key => {
            const s = keyStates[key];
            const cls = s === 2 ? 'correct' : s === 1 ? 'present' : s === 0 ? 'absent' : '';
            const isWide = key === 'ENTER' || key === '⌫';
            return (
              <button key={key} className={`wb-key ${cls}`}
                style={{ flex: isWide ? 1.5 : 1, maxWidth: isWide ? 72 : 44, fontSize: isWide ? '0.65rem' : '0.85rem' }}
                onClick={() => !disabled && onKey(key)} disabled={disabled} aria-label={key}>
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
