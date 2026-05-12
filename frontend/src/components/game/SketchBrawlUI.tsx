'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSketchBrawlStore } from '../../store/sketchBrawlStore';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';
import { Canvas } from './Canvas';
import confetti from 'canvas-confetti';
import { GlassCard } from '../ui/GlassCard';

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export function SketchBrawlUI() {
  const { user } = useAuthStore();
  const { 
    lobbyId, status, players, isDrawer, hint, round, totalRounds, 
    chat, timeLeft, secretWord, drawer, addChatMessage 
  } = useSketchBrawlStore();
  const [chatInput, setChatInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const drawerPlayer = players.find(p => p.socketId === drawer);
  const me = players.find(p => p.username === user?.username);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat]);

  // HPC: Programmatic Sound Generation (Zero-latency, no assets)
  const playPop = (freq = 600) => {
    const AudioContextCtor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('sketchbrawl_solved', () => {
      playPop(800);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b']
      });
    });

    socket.on('sketchbrawl_player_left', ({ username }: { username: string }) => {
      addChatMessage({ sender: 'System', message: `${username || 'A player'} has left the lobby.`, system: true });
    });

    socket.on('sketchbrawl_player_joined', ({ username }: { username: string }) => {
      addChatMessage({ sender: 'System', message: `${username || 'A player'} has joined the lobby!`, system: true });
    });

    return () => {
      socket.off('sketchbrawl_solved');
      socket.off('sketchbrawl_player_left');
      socket.off('sketchbrawl_player_joined');
    };
  }, [addChatMessage]);

  const handleLeave = () => {
    if (window.confirm('Do you really want to leave this room?')) {
      window.location.href = '/lobbies';
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !lobbyId) return;
    
    // Prevent drawer from chatting
    if (isDrawer) {
      setChatInput('');
      return;
    }

    const socket = getSocket();
    socket?.emit('sketchbrawl_chat', { lobbyId, message: chatInput });
    setChatInput('');
  };

  const handleStartGame = () => {
    if (!lobbyId) return;
    const socket = getSocket();
    socket?.emit('sketchbrawl_start_game', { lobbyId });
  };

  if (status === 'waiting') {
    return (
      <GlassCard intensity="high" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <h2 className="font-hand" style={{ fontSize: '2.5rem', marginBottom: 16 }}>Waiting for players...</h2>
        <p className="font-hand" style={{ fontSize: '1.2rem', color: 'var(--wb-ink-light)', marginBottom: 24 }}>
          Lobby Code: <strong style={{ color: 'var(--wb-blue)' }}>{lobbyId}</strong>
        </p>

        <div className="wb-responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 32 }}>
          {players.map((p, i) => (
            <div key={i} style={{ padding: '12px', background: 'var(--wb-paper-alt)', borderRadius: 8, border: '1.5px solid var(--wb-border)' }}>
              <span className="font-hand">{p.username} {p.isHost && '👑'}</span>
            </div>
          ))}
        </div>

        {me && me.isHost && (
          <button 
            className="wb-btn wb-btn-primary wb-btn-lg" 
            onClick={handleStartGame}
            disabled={players.length < 2}
            style={{ width: '100%' }}
          >
            {players.length < 2 ? 'Waiting for more players...' : 'Start Game!'}
          </button>
        )}
      </GlassCard>
    );
  }

  return (
    <div className="sketchbrawl-shell">
      
      {/* Left Sidebar: Players */}
      <div className="sketchbrawl-side" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <GlassCard intensity="mid" style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
          <h3 className="font-hand" style={{ fontSize: '1.5rem', borderBottom: '2px dashed var(--wb-border)', paddingBottom: 8, marginBottom: 12 }}>Players</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence initial={false}>
              {[...players].sort((a, b) => b.score - a.score).map((p) => (
                <motion.div 
                  key={p.socketId} 
                  layout 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 1 }}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: 8, 
                    background: p.solved ? 'var(--wb-correct-bg)' : 'var(--wb-paper-alt)',
                    border: `1.5px solid ${p.solved ? 'var(--wb-correct)' : 'var(--wb-border)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.socketId === drawer && <span title="Drawing">🖌️</span>}
                    {p.solved && <span title="Solved">✅</span>}
                    <span className="font-hand" style={{ fontWeight: p.username === user?.username ? 700 : 400 }}>{p.username}</span>
                  </div>
                  <motion.span 
                    key={p.score}
                    initial={{ scale: 1.2, color: 'var(--wb-correct)' }}
                    animate={{ scale: 1, color: 'var(--wb-blue)' }}
                    className="font-hand" 
                    style={{ fontWeight: 700 }}
                  >
                    {p.score}
                  </motion.span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </GlassCard>
      </div>

      {/* Center: Canvas & Header */}
      <div className="sketchbrawl-main">
        {/* Header (Word & Time) */}
        <GlassCard intensity="low" className="sketchbrawl-topbar">
          <div className="font-hand" style={{ fontSize: 'clamp(0.9rem, 4vw, 1.2rem)', color: 'var(--wb-ink-faint)' }}>
            Round {round} of {totalRounds}
          </div>
          <div style={{ textAlign: 'center' }}>
            {status === 'playing' && (
              <>
                <p className="font-hand" style={{ 
                  fontSize: '1rem', 
                  color: isDrawer ? 'var(--wb-correct)' : 'var(--wb-ink-light)', 
                  marginBottom: 4,
                  fontWeight: isDrawer ? 700 : 400
                }}>
                  {isDrawer ? '🌟 YOUR TURN! Draw this word:' : `${drawerPlayer?.username || 'Someone'} is drawing:`}
                </p>
                <motion.p 
                  className="font-hand" 
                  animate={isDrawer ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  style={{ fontSize: 'clamp(1.2rem, 6vw, 1.8rem)', fontWeight: 700, letterSpacing: isDrawer ? 2 : 6, color: 'var(--wb-ink)', margin: 0 }}
                >
                  {isDrawer ? secretWord : hint}
                </motion.p>
              </>
            )}
            {status === 'finished' && (
              <p className="font-hand" style={{ fontSize: '2rem', fontWeight: 700 }}>Game Over!</p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.5rem' }}>⏱️</span>
              <motion.span 
                className="font-hand" 
                animate={timeLeft < 10000 ? { scale: [1, 1.2, 1], color: ['#000', '#D97706', '#000'] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
                style={{ fontSize: '2rem', fontWeight: 700, color: timeLeft < 15000 ? 'var(--wb-amber)' : 'var(--wb-ink)' }}
              >
                {Math.ceil(timeLeft / 1000)}
              </motion.span>
            </div>
            <button 
              className="wb-btn wb-btn-sm wb-btn-indigo" 
              onClick={handleLeave}
              style={{ padding: '4px 12px', fontSize: '0.9rem' }}
            >
              Leave
            </button>
          </div>
        </GlassCard>

        {/* Drawing Area */}
        <GlassCard intensity="high" className="sketchbrawl-canvas-card">
          {lobbyId && status === 'playing' ? (
            <Canvas lobbyId={lobbyId} isDrawer={isDrawer} />
          ) : status === 'finished' ? (
            <div style={{ textAlign: 'center' }}>
              <h2 className="font-hand" style={{ fontSize: '3rem', marginBottom: 24 }}>Final Scores</h2>
              {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
                <p key={p.socketId} className="font-hand" style={{ fontSize: '1.5rem', marginBottom: 8 }}>
                  {i === 0 ? '🏆' : `${i+1}.`} {p.username}: <strong style={{ color: 'var(--wb-blue)' }}>{p.score}</strong>
                </p>
              ))}
            </div>
          ) : (
            <div className="font-hand" style={{ fontSize: '2rem', color: 'var(--wb-ink-faint)' }}>Waiting for next round...</div>
          )}
        </GlassCard>
      </div>

      {/* Right Sidebar: Chat */}
      <GlassCard intensity="mid" className="sketchbrawl-chat" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', background: 'var(--wb-paper-alt)', borderBottom: '2px solid var(--wb-border)' }}>
          <h3 className="font-hand" style={{ fontSize: '1.3rem', margin: 0 }}>Chat & Guesses</h3>
        </div>
        
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence initial={false}>
            {chat.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: 8, 
                  background: msg.system ? 'var(--wb-correct-bg)' : 'var(--wb-paper-alt)',
                  color: msg.system ? 'var(--wb-correct)' : 'var(--wb-ink)',
                  fontWeight: msg.system ? 700 : 400,
                  fontSize: '0.95rem'
                }}
              >
                {!msg.system && <strong style={{ marginRight: 6 }}>{msg.sender}:</strong>}
                {msg.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <form onSubmit={handleChatSubmit} style={{ padding: 16, borderTop: '2px solid var(--wb-border)', background: 'var(--wb-paper)' }}>
          <input
            type="text"
            className="wb-input"
            placeholder={isDrawer ? "You are drawing! No chatting." : "Type your guess here..."}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isDrawer || status !== 'playing'}
            style={{ width: '100%' }}
          />
        </form>
      </GlassCard>

    </div>
  );
}

