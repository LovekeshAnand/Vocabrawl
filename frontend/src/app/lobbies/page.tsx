'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { connectSocket } from '../../lib/socket';
import { ToastContainer } from '../../components/ui/Toast';
import { GlassCard } from '../../components/ui/GlassCard';

interface Lobby {
  id?: string;        // Scribbl lobbies have 'id'
  code?: string;      // Match lobbies have 'code'
  hostName?: string;  // Scribbl
  host?: string;      // Match
  mode?: string;      // Match mode
  playerCount: number;
  maxPlayers?: number;
  status?: string;
  type: 'scribbl' | 'match';
}

export default function LobbiesPage() {
  const router = useRouter();
  const { user, hydrate, token } = useAuthStore();
  const { addToast } = useGameStore();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [scribblLobbies, setScribblLobbies] = useState<any[]>([]);
  const [matchLobbies, setMatchLobbies] = useState<any[]>([]);

  const [hydrated, setHydrated] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => { 
    hydrate().then(() => setHydrated(true)); 
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const socket = connectSocket(token);

    socket.emit('get_public_rooms');
    socket.emit('scribbl_get_lobbies');

    socket.on('lobbies_update', (rooms) => {
      setMatchLobbies(rooms.map((r: any) => ({ ...r, type: 'match' })));
    });

    socket.on('scribbl_lobbies_update', (rooms) => {
      setScribblLobbies(rooms.map((r: any) => ({ ...r, type: 'scribbl' })));
    });

    return () => {
      socket.off('lobbies_update');
      socket.off('scribbl_lobbies_update');
    };
  }, [token, hydrated]);

  // Combine and sort
  const allLobbies: Lobby[] = [...scribblLobbies, ...matchLobbies].sort((a, b) => b.playerCount - a.playerCount);

  const handleJoinScribbl = (lobbyId: string) => {
    if (!user) { router.push('/login'); return; }
    router.push(`/scribbl/${lobbyId}`);
  };

  const handleJoinMatch = (roomCode: string) => {
    if (!user) { router.push('/login'); return; }
    // We already have join_private_room on the Arena page, but maybe we should just redirect to /private and pre-fill?
    // Actually, we can just trigger join from Arena page. Let's redirect to Arena with a flag, or emit join here.
    // Easier: emit join here, wait for match_start, then redirect.
    const socket = connectSocket(token);
    socket.emit('join_public_room', { roomCode });
    // Note: this will trigger match_start which is handled globally in layout or Arena.
    // Since we don't have a global match_start listener, we should add one or just handle it here.
    socket.once('match_start', (payload) => {
      // Need to use GameStore to setMatchStart, but it's simpler to just route and let Arena handle it.
      // Wait, Arena needs the match_start payload. It's better to just route to a loading page or handle it via store.
      // For now, let's just use the existing private join flow.
      router.push(`/private?code=${roomCode}`); 
    });
  };

  const handleCreateScribbl = () => {
    if (!user) { router.push('/login'); return; }
    const socket = connectSocket(token);
    socket.emit('scribbl_create_lobby', { rounds: 3, maxPlayers: 8, visibility });
    socket.once('scribbl_lobby_joined', ({ lobbyId }) => {
      router.push(`/scribbl/${lobbyId}`);
    });
  };

  const handleJoinByCode = () => {
    if (!user) { router.push('/login'); return; }
    if (joinCode.trim()) {
      router.push(`/scribbl/${joinCode.trim()}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '48px 24px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <h1 className="font-hand" style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--wb-ink)' }}>
            🌐 Public Lobbies
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '2px solid var(--wb-border)', borderRadius: 8, overflow: 'hidden' }}>
              <input 
                type="text" 
                placeholder="Enter Code" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                style={{ padding: '8px 12px', border: 'none', outline: 'none', width: 120, fontSize: '1rem' }}
                className="font-hand"
              />
              <button 
                onClick={handleJoinByCode}
                style={{ background: 'var(--wb-paper-alt)', border: 'none', borderLeft: '2px solid var(--wb-border)', padding: '0 12px', cursor: 'pointer', fontWeight: 'bold' }}
                className="font-hand"
              >
                Join
              </button>
            </div>
            <button className="wb-btn wb-btn-primary" onClick={() => {
              if (!token) {
                addToast('Please login to create a room!', 'warn');
                return;
              }
              setShowCreateModal(true);
            }}>
              🖍️ Create Scribbl Room
            </button>
          </div>
        </div>

        {showCreateModal && (
          <div className="wb-card" style={{ padding: 24, marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-end', background: '#F8FAFC' }}>
            <div style={{ flex: 1 }}>
              <label className="font-hand" style={{ display: 'block', marginBottom: 8, fontSize: '1.1rem' }}>Room Visibility</label>
              <select 
                className="wb-input" 
                value={visibility} 
                onChange={(e) => setVisibility(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="public">Public (Listed Below)</option>
                <option value="private">Private (Invite by Code)</option>
              </select>
            </div>
            <button className="wb-btn wb-btn-green" onClick={handleCreateScribbl}>Create Now</button>
            <button className="wb-btn wb-btn-red" onClick={() => setShowCreateModal(false)}>Cancel</button>
          </div>
        )}

        {allLobbies.length === 0 ? (
          <div className="wb-card" style={{ padding: 60, textAlign: 'center' }}>
            <p className="font-hand" style={{ fontSize: '1.5rem', color: 'var(--wb-ink-faint)', marginBottom: 16 }}>
              No public rooms found.
            </p>
            <button className="wb-btn" onClick={handleCreateScribbl}>Be the first to create one!</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {allLobbies.map((lobby, i) => (
              <motion.div 
                key={lobby.id || lobby.code} 
                className="wb-card" 
                style={{ padding: 24, display: 'flex', flexDirection: 'column' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 className="font-hand" style={{ fontSize: '1.5rem', margin: 0 }}>
                      {lobby.type === 'scribbl' ? '🖍️ Scribbl' : '⚔️ ' + (lobby.mode === 'word_chain' ? 'Word Chain' : lobby.mode === 'anagrams' ? 'Anagrams' : 'Brawl')}
                    </h3>
                    <p className="font-hand" style={{ color: 'var(--wb-ink-light)', margin: 0 }}>
                      Host: {lobby.hostName || lobby.host}
                    </p>
                  </div>
                  <span className="font-hand" style={{ background: 'var(--wb-paper-alt)', padding: '4px 8px', borderRadius: 12, border: '1px solid var(--wb-border)' }}>
                    {lobby.playerCount} / {lobby.maxPlayers || 2}
                  </span>
                </div>
                
                <div style={{ marginTop: 'auto' }}>
                  {(lobby.type === 'scribbl' && lobby.status === 'playing') ? (
                    <button className="wb-btn wb-btn-red" style={{ width: '100%' }} disabled>Game in Progress</button>
                  ) : (
                    <button 
                      className="wb-btn wb-btn-green" 
                      style={{ width: '100%' }}
                      onClick={() => lobby.type === 'scribbl' ? handleJoinScribbl(lobby.id!) : handleJoinMatch(lobby.code!)}
                      disabled={lobby.playerCount >= (lobby.maxPlayers || 2)}
                    >
                      {lobby.playerCount >= (lobby.maxPlayers || 2) ? 'Room Full' : 'Join Game'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {/* Info Section */}
        <div style={{ marginTop: 60 }}>
          <h2 className="font-hand" style={{ fontSize: '2.2rem', marginBottom: 24 }}>Scribbl Rules</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <GlassCard intensity="low" style={{ padding: 24 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12 }}>🎨 Drawing</h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--wb-ink-light)', lineHeight: 1.5 }}>
                When it's your turn, pick a word and draw it on the canvas. Try to be as clear as possible so others can guess it quickly!
              </p>
            </GlassCard>
            <GlassCard intensity="low" style={{ padding: 24 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12 }}>🔍 Guessing</h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--wb-ink-light)', lineHeight: 1.5 }}>
                Watch the drawing and type your guess in the chat. The faster you guess correctly, the more points you earn!
              </p>
            </GlassCard>
          </div>
        </div>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
