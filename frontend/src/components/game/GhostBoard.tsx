'use client';
import { LetterState } from '../../types/game';

const STATE_CLASS: Record<number, string> = { 0: 'absent', 1: 'present', 2: 'correct' };
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const SIZE = 18;

interface GhostBoardProps {
  progress: { result: LetterState[] }[];
  label: string;
  guessCount: number;
}

export function GhostBoard({ progress, label, guessCount }: GhostBoardProps) {
  return (
    <div className="wb-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 130 }}>
      <p className="font-hand" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--wb-ink)' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Array.from({ length: MAX_GUESSES }, (_, i) => (
          <div key={i} style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: WORD_LENGTH }, (_, j) => {
              const s = progress[i]?.result[j];
              const cls = (s !== null && s !== undefined) ? STATE_CLASS[s as number] : '';
              return (
                <div key={j} style={{
                  width: SIZE, height: SIZE, border: '1.5px solid var(--wb-border)', borderRadius: 3,
                  background: cls === 'correct' ? 'var(--wb-correct-bg)' : cls === 'present' ? 'var(--wb-present-bg)' : cls === 'absent' ? 'var(--wb-absent-bg)' : 'white',
                }} />
              );
            })}
          </div>
        ))}
      </div>
      <p className="font-hand" style={{ fontSize: '0.85rem', color: 'var(--wb-ink-faint)' }}>{guessCount}/{MAX_GUESSES}</p>
    </div>
  );
}
