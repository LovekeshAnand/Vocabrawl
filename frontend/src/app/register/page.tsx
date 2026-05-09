'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { useAuthStore } from '../../store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [localErr, setLocalErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); clearError(); setLocalErr('');
    if (form.password !== form.confirm) { setLocalErr('Passwords do not match'); return; }
    try { await register(form.username, form.password); router.push('/'); } catch {}
  };

  const displayError = localErr || error;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div className="wb-card" style={{ width: '100%', maxWidth: 420, padding: '40px 36px' }}
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-hand" style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--wb-ink)', marginBottom: 6 }}>📝 Join the Arena</h1>
          <p style={{ color: 'var(--wb-ink-faint)', fontSize: '0.9rem', marginBottom: 28 }}>Create your fighter profile.</p>
          {displayError && <div style={{ background: '#FEF2F2', border: '2px solid var(--wb-red)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--wb-red)', fontFamily: "'Caveat', cursive", fontSize: '1.05rem', fontWeight: 600 }}>⚠️ {displayError}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { id: 'reg-u', label: 'Username', key: 'username', type: 'text', placeholder: 'word_warrior_99', ac: 'username' },
              { id: 'reg-p', label: 'Password', key: 'password', type: 'password', placeholder: '••••••••', ac: 'new-password' },
              { id: 'reg-c', label: 'Confirm Password', key: 'confirm', type: 'password', placeholder: '••••••••', ac: 'new-password' },
            ].map(f => (
              <div key={f.key}>
                <label className="font-hand" style={{ fontSize: '1.1rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input id={f.id} className="wb-input" type={f.type} placeholder={f.placeholder} autoComplete={f.ac}
                  value={form[f.key as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} required />
              </div>
            ))}
            <motion.button id="register-submit" type="submit" className="wb-btn wb-btn-primary" disabled={loading}
              whileHover={{ y: -2 }} whileTap={{ y: 1 }} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
              {loading ? '⏳ Creating…' : '🚀 Create Account'}
            </motion.button>
          </form>
          <hr className="wb-divider" style={{ margin: '24px 0' }} />
          <p className="font-hand" style={{ textAlign: 'center', fontSize: '1.1rem', color: 'var(--wb-ink-light)' }}>
            Have an account? <Link href="/login" style={{ color: 'var(--wb-blue)', fontWeight: 700 }}>Login</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
