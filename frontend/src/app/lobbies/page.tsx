'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LucidePalette as Palette,
  LucideSword as Sword,
  LucideLink as LinkIcon,
  LucideShuffle as Shuffle,
  LucideUsers as Users,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { connectSocket } from '../../lib/socket';
import { ToastContainer } from '../../components/ui/Toast';
import { GlassCard } from '../../components/ui/GlassCard';

type MatchMode = 'brawl' | 'word_chain' | 'anagrams';

interface Lobby {
  id?: string;
  code?: string;
  hostName?: string;
  host?: string;
  mode?: MatchMode;
  playerCount: number;
  maxPlayers?: number;
  status?: string;
  type: 'scribbl' | 'match';
}

const matchModes: Array<{
  mode: MatchMode;
  title: string;
  icon: ReactNode;
  accent: string;
  description: string;
}> = [
  {
    mode: 'brawl',
    title: 'Brawl',
    icon: <Sword size={20} />,
    accent: 'var(--wb-blue)',
    description: 'Wordle-style public duels using the same hidden word.',
  },
  {
    mode: 'word_chain',
    title: 'Word Chain',
    icon: <LinkIcon size={20} />,
    accent: 'var(--wb-correct)',
    description: 'Turn-based rooms where each word starts from the previous final letter.',
  },
  {
    mode: 'anagrams',
    title: 'Anagrams',
    icon: <Shuffle size={20} />,
    accent: 'var(--wb-amber)',
    description: 'Scramble rooms where players race to solve the same anagram.',
  },
];

export default function LobbiesPage() {
  const router = useRouter();
  const { user, hydrate, token } = useAuthStore();
  const { addToast, setMatchStart, setRoomExpiresAt } = useGameStore();
  const [scribblLobbies, setScribblLobbies] = useState<Lobby[]>([]);
  const [matchLobbies, setMatchLobbies] = useState<Lobby[]>([]);

  const [hydrated, setHydrated] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    hydrate().then(() => setHydrated(true));
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const socket = connectSocket(token);

    socket.emit('get_public_rooms');
    socket.emit('scribbl_get_lobbies');

    socket.on('lobbies_update', (rooms: Omit<Lobby, 'type'>[]) => {
      setMatchLobbies(rooms.map((r) => ({ ...r, type: 'match' })));
    });

    socket.on('scribbl_lobbies_update', (rooms: Omit<Lobby, 'type'>[]) => {
      setScribblLobbies(rooms.map((r) => ({ ...r, type: 'scribbl' })));
    });

    socket.on('private_room_created', ({ roomCode, expiresAt }) => {
      setRoomExpiresAt(expiresAt ?? null);
      router.push(`/arena/lobby/${roomCode}`);
    });

    socket.on('match_start', (payload) => {
      setMatchStart(payload);
      router.push(`/arena/${payload.matchId}`);
    });

    socket.on('error_event', (msg: string) => {
      addToast(msg, 'error');
    });

    return () => {
      socket.off('lobbies_update');
      socket.off('scribbl_lobbies_update');
      socket.off('private_room_created');
      socket.off('match_start');
      socket.off('error_event');
    };
  }, [token, hydrated, router, setMatchStart, setRoomExpiresAt, addToast]);

  const handleJoinScribbl = (lobbyId: string) => {
    if (!user) { router.push('/login'); return; }
    router.push(`/scribbl/${lobbyId}`);
  };

  const handleJoinMatch = (roomCode: string) => {
    if (!user) { router.push('/login'); return; }
    router.push(`/arena/lobby/${roomCode}`);
  };

  const handleCreateScribbl = () => {
    if (!user) { router.push('/login'); return; }
    const socket = connectSocket(token);
    socket.emit('scribbl_create_lobby', { rounds: 3, maxPlayers: 8, visibility });
    socket.once('scribbl_lobby_joined', ({ lobbyId }) => {
      router.push(`/scribbl/${lobbyId}`);
    });
  };

  const handleCreateMatch = (mode: MatchMode) => {
    if (!user) { router.push('/login'); return; }
    const socket = connectSocket(token);
    socket.emit('create_private_room', { mode, visibility: 'public' });
  };

  const handleJoinByCode = () => {
    if (!user) { router.push('/login'); return; }
    const code = joinCode.trim().toUpperCase();
    if (code.length === 6) {
      handleJoinMatch(code);
    } else if (code) {
      router.push(`/scribbl/${code}`);
    }
  };

  const renderLobbyCard = (lobby: Lobby, index: number) => (
    <motion.div
      key={lobby.id || lobby.code}
      className="wb-card"
      style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 150 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div>
          <h3 className="font-hand" style={{ fontSize: '1.45rem', margin: 0 }}>
            {lobby.type === 'scribbl' ? 'Scribbl' : matchModes.find(game => game.mode === lobby.mode)?.title || 'Brawl'}
          </h3>
          <p style={{ color: 'var(--wb-ink-light)', margin: 0, fontSize: '0.9rem' }}>
            Host: {lobby.hostName || lobby.host || 'Player'}
          </p>
        </div>
        <span style={{ background: 'var(--wb-paper-alt)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--wb-border)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Users size={14} />
          {lobby.playerCount}/{lobby.maxPlayers || 2}
        </span>
      </div>

      <div style={{ marginTop: 'auto' }}>
        {lobby.type === 'scribbl' && lobby.status === 'playing' ? (
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
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '48px 24px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="font-hand" style={{ fontSize: 'clamp(2.2rem, 8vw, 3rem)', fontWeight: 700, color: 'var(--wb-ink)' }}>
              Public Lobbies
            </h1>
            <p style={{ color: 'var(--wb-ink-light)', maxWidth: 640 }}>
              Rooms are grouped by game so it is clear what you are joining before the match starts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', border: '2px solid var(--wb-border)', borderRadius: 8, overflow: 'hidden', background: 'var(--wb-paper)' }}>
              <input
                type="text"
                placeholder="Enter Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                style={{ padding: '8px 12px', border: 'none', outline: 'none', width: 130, fontSize: '1rem', background: 'transparent', color: 'var(--wb-ink)' }}
              />
              <button
                onClick={handleJoinByCode}
                style={{ background: 'var(--wb-paper-alt)', border: 'none', borderLeft: '2px solid var(--wb-border)', padding: '0 12px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--wb-ink)' }}
              >
                Join
              </button>
            </div>
            <button className="wb-btn wb-btn-primary" onClick={() => {
              if (!token) {
                addToast('Please login to create a room.', 'warn');
                return;
              }
              setShowCreateModal(true);
            }}>
              Create Scribbl Room
            </button>
          </div>
        </div>

        {showCreateModal && (
          <div className="wb-card wb-mobile-stack" style={{ padding: 24, marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-end', background: 'var(--wb-paper)' }}>
            <div style={{ flex: 1 }}>
              <label className="font-hand" style={{ display: 'block', marginBottom: 8, fontSize: '1.1rem' }}>Room Visibility</label>
              <select
                className="wb-input"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="public">Public, listed below</option>
                <option value="private">Private, invite by code</option>
              </select>
            </div>
            <button className="wb-btn wb-btn-green" onClick={handleCreateScribbl}>Create Now</button>
            <button className="wb-btn wb-btn-red" onClick={() => setShowCreateModal(false)}>Cancel</button>
          </div>
        )}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <GlassCard intensity="mid" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
              <div>
                <h2 className="font-hand" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Palette size={22} color="var(--wb-purple)" />
                  Scribbl
                </h2>
                <p style={{ color: 'var(--wb-ink-light)' }}>Drawing and guessing rooms for groups.</p>
              </div>
              <button className="wb-btn" onClick={() => setShowCreateModal(true)}>Create Scribbl</button>
            </div>
            {scribblLobbies.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
                {scribblLobbies.map(renderLobbyCard)}
              </div>
            ) : (
              <p style={{ color: 'var(--wb-ink-faint)' }}>No public Scribbl rooms right now.</p>
            )}
          </GlassCard>

          {matchModes.map((game) => {
            const rooms = matchLobbies.filter(lobby => lobby.mode === game.mode);
            return (
              <GlassCard key={game.mode} intensity="mid" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
                  <div>
                    <h2 className="font-hand" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: game.accent }}>{game.icon}</span>
                      {game.title}
                    </h2>
                    <p style={{ color: 'var(--wb-ink-light)' }}>{game.description}</p>
                  </div>
                  <button className="wb-btn wb-btn-primary" onClick={() => handleCreateMatch(game.mode)}>
                    Create Public {game.title}
                  </button>
                </div>
                {rooms.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
                    {rooms.map(renderLobbyCard)}
                  </div>
                ) : (
                  <p style={{ color: 'var(--wb-ink-faint)' }}>No public {game.title} rooms right now.</p>
                )}
              </GlassCard>
            );
          })}
        </section>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
