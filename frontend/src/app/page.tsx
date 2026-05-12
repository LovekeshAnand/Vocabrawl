'use client';
import { Analytics } from "@vercel/analytics/next"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Users, Zap, Trophy, Sparkles, MousePointer2, Sword, Target, Gamepad2, Activity } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { connectSocket } from '../lib/socket';
import { ToastContainer } from '../components/ui/Toast';
import { GlassCard } from '../components/ui/GlassCard';

const WORDS = ['SCRIBBL', 'BRAWL', 'WORDS', 'ARENA', 'CLASH', 'SWIFT', 'THINK', 'SOLVE'];

export default function HomePage() {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const { setMatchStart, addToast, onlineCount, setOnlineCount } = useGameStore();
  const [queueing, setQueueing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { hydrate(); }, []);
  useEffect(() => { const t = setInterval(() => setTick(i => (i + 1) % WORDS.length), 1500); return () => clearInterval(t); }, []);

  useEffect(() => {
    const socket = connectSocket(useAuthStore.getState().token);
    socket.on('presence_update', ({ onlineCount }) => setOnlineCount(onlineCount));
    socket.emit('request_presence');
    return () => { socket.off('presence_update'); };
  }, [setOnlineCount]);

  const handleEnterArena = () => {
    if (!user) { router.push('/login'); return; }
    setQueueing(true);
    const token = useAuthStore.getState().token;
    const socket = connectSocket(token);
    socket.once('match_start', (payload) => {
      setMatchStart(payload);
      setQueueing(false);
      router.push(`/arena/${payload.matchId}`);
    });
    socket.once('error_event', (msg: string) => { addToast(msg, 'error'); setQueueing(false); });
    socket.emit('join_queue');
    addToast('🔍 Searching for opponent...', 'info');
  };

  const handleLeaveQueue = () => {
    const socket = connectSocket(useAuthStore.getState().token);
    socket.emit('leave_queue');
    setQueueing(false);
    addToast('Queue left', 'info');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--wb-paper)' }}>
      <Analytics/>
      <Navbar />
      <ToastContainer />

      {/* Hero Section */}
      <section style={{ padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ maxWidth: 1000, margin: '0 auto' }}
        >
          <h1 className="font-hand" style={{ 
            fontSize: 'clamp(3.5rem, 10vw, 7rem)', fontWeight: 950, 
            color: 'var(--wb-ink)', lineHeight: 0.9, marginBottom: 32 
          }}>
            VocaBrawl
          </h1>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 48 }}>
            {WORDS[tick].split('').map((l, i) => (
              <motion.div 
                key={`${tick}-${i}`} 
                className="wb-tile correct"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                style={{ width: 'clamp(38px, 10vw, 48px)', height: 'clamp(38px, 10vw, 48px)', fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', boxShadow: 'var(--shadow-md)' }}
              >
                {l}
              </motion.div>
            ))}
          </div>

          <p style={{ 
            fontSize: '1.4rem', color: 'var(--wb-ink-light)', 
            maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.4, fontWeight: 500
          }}>
            The ultimate arena for word warriors. <br/>
            Draw, guess, and battle your way to the top.
          </p>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <Link href="/arena">
              <motion.button 
                className="wb-btn wb-btn-primary wb-btn-lg" 
                whileHover={{ scale: 1.05, rotate: -1 }} 
                whileTap={{ scale: 0.95 }}
                style={{ padding: '16px 48px', fontSize: '1.4rem', boxShadow: '8px 8px 0 var(--wb-border)' }}
              >
                Start Playing
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Game Modes Showcase */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 className="font-hand" style={{ fontSize: '3rem', marginBottom: 12 }}>Choose Your Battle</h2>
          <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.2rem' }}>Three ways to play, one way to win.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 30 }}>
          <GlassCard intensity="high" style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ color: 'var(--wb-indigo)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <Zap size={40} />
              <h3 className="font-hand" style={{ fontSize: '2rem' }}>The Arena</h3>
            </div>
            <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.05rem', lineHeight: 1.6, flex: 1 }}>
              Ranked 1v1 battles. Match with opponents near your skill level in high-stakes word duels. Climb the leaderboard and claim your rank.
            </p>
            <Link href="/arena">
              <button className="wb-btn wb-btn-primary" style={{ width: '100%' }}>Enter Arena</button>
            </Link>
          </GlassCard>

          <GlassCard intensity="high" style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ color: 'var(--wb-blue)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <Palette size={40} />
              <h3 className="font-hand" style={{ fontSize: '2rem' }}>SketchBrawl</h3>
            </div>
            <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.05rem', lineHeight: 1.6, flex: 1 }}>
              Classic multiplayer drawing and guessing. Join a room, grab the brush, and let your creativity (or lack of it) shine!
            </p>
            <Link href="/lobbies">
              <button className="wb-btn" style={{ width: '100%', borderColor: 'var(--wb-blue)', color: 'var(--wb-blue)' }}>Open Lobbies</button>
            </Link>
          </GlassCard>

          <GlassCard intensity="high" style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ color: 'var(--wb-correct)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <Sword size={40} />
              <h3 className="font-hand" style={{ fontSize: '2rem' }}>The Gauntlet</h3>
            </div>
            <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.05rem', lineHeight: 1.6, flex: 1 }}>
              A solo survival mode. Solve as many words as you can against the clock. Each correct guess adds time. How long can you last?
            </p>
            <Link href="/gauntlet">
              <button className="wb-btn" style={{ width: '100%', borderColor: 'var(--wb-correct)', color: 'var(--wb-correct)' }}>Face Gauntlet</button>
            </Link>
          </GlassCard>
        </div>
      </section>

      {/* Feature Section */}
      <section style={{ padding: '80px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 30 }}>
          <GlassCard intensity="mid" style={{ padding: 40 }}>
            <div style={{ color: 'var(--wb-blue)', marginBottom: 24 }}><Sparkles size={48} /></div>
            <h3 className="font-hand" style={{ fontSize: '2.2rem', marginBottom: 16 }}>Beautiful Lines</h3>
            <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Our drawing tools automatically polish your lines, making every sketch look like a masterpiece, even if you&apos;re using a mouse!
            </p>
          </GlassCard>

          <GlassCard intensity="mid" style={{ padding: 40 }}>
            <div style={{ color: 'var(--wb-indigo)', marginBottom: 24 }}><Zap size={48} /></div>
            <h3 className="font-hand" style={{ fontSize: '2.2rem', marginBottom: 16 }}>Lightning Fast</h3>
            <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.1rem', lineHeight: 1.6 }}>
              No waiting around. Everything happens instantly—from your drawing appearing on other screens to your guesses being checked.
            </p>
          </GlassCard>

          <GlassCard intensity="mid" style={{ padding: 40 }}>
            <div style={{ color: 'var(--wb-purple)', marginBottom: 24 }}><Trophy size={48} /></div>
            <h3 className="font-hand" style={{ fontSize: '2.2rem', marginBottom: 16 }}>Daily Ranks</h3>
            <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Play against people from all over the world and see where you stand on the global leaderboard. Can you become a Master?
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Pro Features */}
      <section style={{ padding: '100px 24px', background: 'var(--wb-paper)', borderTop: '2.5px solid var(--wb-border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="font-hand" style={{ fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', marginBottom: 60 }}>Why You&apos;ll Love VocaBrawl</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40 }}>
            {[
              { icon: <Gamepad2 size={32} />, title: "So Smooth", desc: "Built to feel incredibly responsive on any device." },
              { icon: <MousePointer2 size={32} />, title: "Artist Tools", desc: "A vibrant 24-color palette and easy-to-use brushes." },
              { icon: <Trophy size={32} />, title: "Fun Prizes", desc: "Earn special badges and ranks as you win matches." },
              { icon: <Users size={32} />, title: "Play Anywhere", desc: "Create private rooms for parties or play with strangers." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
              >
                <div style={{ 
                  width: 70, height: 70, borderRadius: '50%', background: 'var(--wb-paper-alt)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  border: '2.5px solid var(--wb-border)', boxShadow: 'var(--shadow-md)', color: 'var(--wb-blue)'
                }}>
                  {item.icon}
                </div>
                <h4 className="font-hand" style={{ fontSize: '1.6rem', margin: 0 }}>{item.title}</h4>
                <p style={{ color: 'var(--wb-ink-light)', margin: 0 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

