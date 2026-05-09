'use client';
import { Modal } from '../ui/Modal';

interface HelpModalProps { open: boolean; onClose: () => void; mode: 'arena' | 'gauntlet'; }

export function HelpModal({ open, onClose, mode }: HelpModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={mode === 'arena' ? '⚔️ How to Brawl' : '🏃 The Gauntlet'}>
      <div style={{ color: 'var(--wb-ink)' }}>
        <p className="font-hand" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>Tile Colours</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[
            { letter: 'B', cls: 'correct', label: 'Green — correct position', color: 'var(--wb-correct)' },
            { letter: 'R', cls: 'present', label: 'Yellow — in word, wrong spot', color: 'var(--wb-present)' },
            { letter: 'W', cls: 'absent',  label: 'Gray — not in word', color: 'var(--wb-absent)' },
          ].map(t => (
            <div key={t.cls} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className={`wb-tile ${t.cls}`} style={{ flexShrink: 0 }}>{t.letter}</div>
              <span style={{ color: 'var(--wb-ink-light)', fontSize: '0.95rem' }}><strong style={{ color: t.color }}>{t.label.split('—')[0]}</strong>—{t.label.split('—')[1]}</span>
            </div>
          ))}
        </div>
        <hr className="wb-divider" />
        {mode === 'arena' ? (
          <>
            <p className="font-hand" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>⚔️ Rules</p>
            <ul style={{ color: 'var(--wb-ink-light)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>• Both players get the <strong>same secret word</strong> — never sent to your browser</li>
              <li>• Guess the 5-letter word in <strong>6 tries or fewer</strong></li>
              <li>• <strong>First to solve wins</strong> the match and earns ELO</li>
              <li>• Watch the <strong>Ghost Board</strong> — shows opponent colour progress (no letters)</li>
            </ul>
          </>
        ) : (
          <>
            <p className="font-hand" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>🏃 Rules</p>
            <ul style={{ color: 'var(--wb-ink-light)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>• Solo mode — 60 seconds on the clock</li>
              <li>• Solve a word → <strong>+15s bonus time</strong> + points</li>
              <li>• Fewer guesses = more points per word</li>
              <li>• Run out of guesses (6) and it&apos;s game over</li>
            </ul>
          </>
        )}
        <hr className="wb-divider" />
        <p className="font-hand" style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>⌨️ Shortcuts</p>
        <p style={{ color: 'var(--wb-ink-light)', fontSize: '0.9rem' }}><strong>Enter</strong> — submit guess &nbsp;|&nbsp; <strong>Backspace</strong> — delete &nbsp;|&nbsp; <strong>?</strong> — this help</p>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="wb-btn wb-btn-primary wb-btn-sm" onClick={onClose}>Got it!</button>
        </div>
      </div>
    </Modal>
  );
}
