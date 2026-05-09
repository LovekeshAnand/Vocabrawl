'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string; }

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,46,0.45)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
          <motion.div className={`wb-card ${width}`}
            style={{ position: 'relative', width: '100%', maxWidth: 560, padding: 24 }}
            initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="font-hand" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--wb-ink)' }}>{title}</h2>
              <button className="wb-key" style={{ width: 36, height: 36, fontSize: '1rem', flexShrink: 0 }} onClick={onClose}>✕</button>
            </div>
            <hr className="wb-divider" style={{ margin: '0 0 16px' }} />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
