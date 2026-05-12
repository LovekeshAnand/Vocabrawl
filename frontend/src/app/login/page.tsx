'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, guestLogin, loading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [guestName, setGuestName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); clearError();
    try { await login(form.username, form.password); router.push('/'); } catch {}
  };

  const handleGuestLogin = async () => {
    if (!guestName.trim()) return;
    clearError();
    try {
      await guestLogin(guestName);
      router.push('/');
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div className="wb-card" style={{ width: '100%', maxWidth: 420, padding: 'clamp(24px, 8vw, 40px) clamp(20px, 6vw, 36px)' }}
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-hand" style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--wb-ink)', marginBottom: 6 }}>✏️ Welcome Back</h1>
          <p style={{ color: 'var(--wb-ink-faint)', fontSize: '0.9rem', marginBottom: 28 }}>Log in to protect your ELO.</p>
          {error && <div style={{ background: '#FEF2F2', border: '2px solid var(--wb-red)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--wb-red)', fontFamily: "'Caveat', cursive", fontSize: '1.05rem', fontWeight: 600 }}>⚠️ {error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="font-hand" style={{ fontSize: '1.1rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Username</label>
              <input id="login-username" className="wb-input" type="text" placeholder="your_username" autoComplete="username"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div>
              <label className="font-hand" style={{ fontSize: '1.1rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label>
              <input id="login-password" className="wb-input" type="password" placeholder="••••••••" autoComplete="current-password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <motion.button id="login-submit" type="submit" className="wb-btn wb-btn-primary" disabled={loading}
              whileHover={{ y: -2 }} whileTap={{ y: 1 }} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
              {loading ? '⏳ Logging in…' : '🔓 Login'}
            </motion.button>
          </form>
          <hr className="wb-divider" style={{ margin: '24px 0' }} />
          <p className="font-hand" style={{ textAlign: 'center', fontSize: '1.1rem', color: 'var(--wb-ink-light)' }}>
            No account? <Link href="/register" style={{ color: 'var(--wb-blue)', fontWeight: 700 }}>Register here</Link>
          </p>

          <div style={{ marginTop: 24, padding: 20, background: 'var(--wb-paper-alt)', borderRadius: 12, border: '2px dashed var(--wb-border)' }}>
            <h3 className="font-hand" style={{ fontSize: '1.4rem', marginBottom: 12 }}>🏃 Fast Play</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                type="text" 
                className="wb-input wb-input-sm" 
                placeholder="Guest name..." 
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button 
                className="wb-btn wb-btn-sm" 
                onClick={handleGuestLogin}
                disabled={loading}
              >
                {loading ? '...' : 'Play!'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--wb-ink-faint)', marginTop: 8 }}>
              No stats tracking for guest accounts.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
