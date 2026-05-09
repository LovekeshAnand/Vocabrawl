'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from './GlassCard';

export function CookieConsent() {
  const { cookiesAccepted, acceptCookies } = useAuthStore();

  return (
    <AnimatePresence>
      {!cookiesAccepted && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: 'calc(100% - 48px)',
            maxWidth: 500,
            pointerEvents: 'none', // Critical: Container doesn't block clicks
          }}
        >
          <GlassCard intensity="high" style={{ padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}>
            <h4 className="font-hand" style={{ fontSize: '1.5rem', marginBottom: 8 }}>Cookie Time! 🍪</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--wb-ink-light)', lineHeight: 1.5, marginBottom: 20 }}>
              We use cookies to keep you logged in across sessions and maintain your game state. 
              By accepting, you allow us to store your token in your browser.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="wb-btn wb-btn-primary" 
                style={{ flex: 1, padding: '10px 20px' }}
                onClick={acceptCookies}
              >
                Accept & Play
              </button>
              <button 
                className="wb-btn" 
                style={{ flex: 1, padding: '10px 20px' }}
                onClick={() => { /* Close but don't accept? No, usually just hide */ }}
              >
                Learn More
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
