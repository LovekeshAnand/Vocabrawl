'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function ToastContainer() {
  const toasts = useGameStore(s => s.toasts);
  const removeToast = useGameStore(s => s.removeToast);
  return (
    <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.92 }}
            transition={{ duration: 0.22 }}
            onClick={() => removeToast(t.id)}
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              background: t.type === 'error' ? '#DC2626' : t.type === 'success' ? '#2D6A4F' : t.type === 'warn' ? '#B5760A' : '#1A1A2E',
              color: 'white', padding: '10px 28px', borderRadius: 8,
              fontFamily: "'Caveat', cursive", fontSize: '1.15rem', fontWeight: 700,
              border: '2px solid #2D2D2D', boxShadow: '3px 3px 0 #2D2D2D', whiteSpace: 'nowrap',
            }}
          >{t.message}</motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
