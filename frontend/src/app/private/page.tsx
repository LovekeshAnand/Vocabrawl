'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { connectSocket, getSocket } from '../../lib/socket';
import { ToastContainer } from '../../components/ui/Toast';

export default function PrivateRoomPage() {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const { setMatchStart, addToast } = useGameStore();
  
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code');

  const [roomCode, setRoomCode] = useState(initialCode || '');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [mode, setMode] = useState('brawl');
  const [visibility, setVisibility] = useState('private');
  const [joining, setJoining] = useState(false);

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('private_room_created', ({ roomCode }) => {
        setGeneratedCode(roomCode);
        addToast(`Room created: ${roomCode}`, 'success');
      });

      socket.on('match_start', (payload) => {
        setMatchStart(payload);
        router.push(`/arena/${payload.matchId}`);
      });

      socket.on('error_event', (msg: string) => {
        addToast(msg, 'error');
        setJoining(false);
      });
    }

    return () => {
      socket?.off('private_room_created');
      socket?.off('match_start');
      socket?.off('error_event');
    };
  }, [router, setMatchStart, addToast]);

  const handleCreateRoom = () => {
    if (!user) { router.push('/login'); return; }
    const socket = connectSocket(useAuthStore.getState().token);
    socket.emit('create_private_room', { mode, visibility });
  };

  const handleJoinRoom = () => {
    if (!user) { router.push('/login'); return; }
    if (!roomCode || roomCode.length !== 6) {
      addToast('Invalid room code', 'warn');
      return;
    }
    setJoining(true);
    const socket = connectSocket(useAuthStore.getState().token);
    socket.emit('join_private_room', { roomCode: roomCode.toUpperCase() });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <ToastContainer />

      <main style={{ flex: 1, padding: '48px 24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <h1 className="font-hand" style={{ fontSize: '3rem', fontWeight: 700, textAlign: 'center', marginBottom: 40, color: 'var(--wb-ink)' }}>
          🤝 Play with Friend
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {/* Create Room */}
          <motion.div className="wb-card" style={{ padding: 32 }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="font-hand" style={{ fontSize: '1.8rem', marginBottom: 16 }}>Host a Match</h2>
            <p style={{ color: 'var(--wb-ink-light)', marginBottom: 24, fontSize: '0.95rem' }}>
              Create a private room and share the code with a friend to play together.
            </p>

            {!generatedCode ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label className="font-hand" style={{ fontSize: '1.1rem', display: 'block', marginBottom: 8 }}>Select Game Mode</label>
                  <select 
                    className="wb-input" 
                    value={mode} 
                    onChange={(e) => setMode(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="brawl">Standard Brawl (Wordle-style)</option>
                    <option value="word_chain">Word Chain (Combo Mode)</option>
                    <option value="anagrams">Anagram Scramble</option>
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="font-hand" style={{ fontSize: '1.1rem', display: 'block', marginBottom: 8 }}>Visibility</label>
                  <select 
                    className="wb-input" 
                    value={visibility} 
                    onChange={(e) => setVisibility(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="private">Private (Invite Only)</option>
                    <option value="public">Public (Listed in Lobbies)</option>
                  </select>
                </div>
                <button className="wb-btn wb-btn-primary" style={{ width: '100%' }} onClick={handleCreateRoom}>
                  ✨ Create Room
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--wb-paper-alt)', borderRadius: 8, border: '2px dashed var(--wb-ink)' }}>
                <p className="font-hand" style={{ fontSize: '1.2rem', marginBottom: 8 }}>Your Room Code:</p>
                <p className="font-hand" style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: 4, color: 'var(--wb-blue)' }}>
                  {generatedCode}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--wb-ink-faint)', marginTop: 8 }}>
                  Waiting for friend to join...
                </p>
              </div>
            )}
          </motion.div>

          {/* Join Room */}
          <motion.div className="wb-card" style={{ padding: 32 }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="font-hand" style={{ fontSize: '1.8rem', marginBottom: 16 }}>Join a Friend</h2>
            <p style={{ color: 'var(--wb-ink-light)', marginBottom: 24, fontSize: '0.95rem' }}>
              Enter the code shared by your friend to enter their private arena.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label className="font-hand" style={{ fontSize: '1.1rem', display: 'block', marginBottom: 8 }}>Enter Room Code</label>
              <input 
                type="text" 
                className="wb-input" 
                placeholder="E.g. A1B2C3" 
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: 4 }}
              />
            </div>
            <button 
              className="wb-btn wb-btn-green" 
              style={{ width: '100%' }} 
              onClick={handleJoinRoom}
              disabled={joining}
            >
              {joining ? '⏳ Joining...' : '⚔️ Join Match'}
            </button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
