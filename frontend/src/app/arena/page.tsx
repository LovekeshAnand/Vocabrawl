'use client';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LucideSword as Sword,
  LucideZap as Zap,
  LucideTrophy as Trophy,
  LucideUsers as Users,
  LucidePlay as Play,
  LucideShuffle as Shuffle,
  LucideLink as LinkIcon,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { connectSocket } from '../../lib/socket';
import { ToastContainer } from '../../components/ui/Toast';

type ArenaTab = 'ranked' | 'public' | 'private';
type ArenaMode = 'brawl' | 'word_chain' | 'anagrams';

interface PublicRoom {
  code: string;
  host: string;
  mode: ArenaMode;
  playerCount: number;
  maxPlayers?: number;
}

const gameModes: Array<{
  mode: ArenaMode;
  title: string;
  shortTitle: string;
  icon: ReactNode;
  accent: string;
  summary: string;
  rankedCopy: string;
  publicCopy: string;
}> = [
  {
    mode: 'brawl',
    title: 'Brawl',
    shortTitle: 'Brawl',
    icon: <Sword size={22} />,
    accent: 'var(--wb-blue)',
    summary: 'Wordle-style duel. Both players solve the same hidden word.',
    rankedCopy: 'Best for fast 1v1 ranked games. First clean solve wins the ELO swing.',
    publicCopy: 'Create or join a casual Brawl room for a quick head-to-head word duel.',
  },
  {
    mode: 'word_chain',
    title: 'Word Chain',
    shortTitle: 'Chain',
    icon: <LinkIcon size={22} />,
    accent: 'var(--wb-correct)',
    summary: 'Take turns playing words that begin with the previous word\'s last letter.',
    rankedCopy: 'Turn-based ranked pressure. Build the chain and race to the target score.',
    publicCopy: 'Open a Chain room when you want a tactical back-and-forth word game.',
  },
  {
    mode: 'anagrams',
    title: 'Anagrams',
    shortTitle: 'Anagrams',
    icon: <Shuffle size={22} />,
    accent: 'var(--wb-amber)',
    summary: 'Unscramble the same letters before your opponent does.',
    rankedCopy: 'Ranked scramble rounds. Solve faster to stack points and close the match.',
    publicCopy: 'Start an Anagrams room for a quick reflex-and-vocabulary challenge.',
  },
];

export default function ArenaLobbyPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { onlineCount, addToast, setMatchStart, setRoomExpiresAt } = useGameStore();

  const [isQueueing, setIsQueueing] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [queueMode, setQueueMode] = useState<ArenaMode | null>(null);
  const [activeTab, setActiveTab] = useState<ArenaTab>('ranked');
  const [roomCode, setRoomCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('match_start', (payload) => {
      setMatchStart(payload);
      addToast('Match found. Joining...', 'success');
      router.push(`/arena/${payload.matchId}`);
    });

    socket.on('private_room_created', ({ roomCode, expiresAt }) => {
      addToast('Room created.', 'success');
      setRoomExpiresAt(expiresAt);
      router.push(`/arena/lobby/${roomCode}`);
    });

    socket.on('lobbies_update', (rooms) => {
      setPublicRooms(rooms);
    });

    socket.on('queue_joined', () => {
      setIsQueueing(true);
    });

    socket.on('queue_left', () => {
      setIsQueueing(false);
      setQueueMode(null);
      setQueueTime(0);
    });

    socket.on('error_event', (msg: string) => {
      addToast(msg || 'An error occurred', 'error');
      setIsQueueing(false);
      setQueueMode(null);
      setQueueTime(0);
    });

    socket.emit('get_public_rooms');

    return () => {
      socket.off('match_start');
      socket.off('private_room_created');
      socket.off('lobbies_update');
      socket.off('queue_joined');
      socket.off('queue_left');
      socket.off('error_event');
    };
  }, [token, router, setMatchStart, setRoomExpiresAt, addToast]);

  useEffect(() => {
    if (!isQueueing) return;
    const timer = setInterval(() => setQueueTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isQueueing]);

  const publicRoomsByMode = useMemo(() => {
    return gameModes.reduce<Record<ArenaMode, PublicRoom[]>>((acc, game) => {
      acc[game.mode] = publicRooms.filter(room => room.mode === game.mode);
      return acc;
    }, { brawl: [], word_chain: [], anagrams: [] });
  }, [publicRooms]);

  const handleJoinQueue = (mode: ArenaMode) => {
    if (!token) {
      addToast('Please login to join the ranked queue.', 'warn');
      return;
    }
    const socket = connectSocket(token);
    if (isQueueing && queueMode === mode) {
      socket.emit('leave_queue');
      setIsQueueing(false);
      setQueueMode(null);
      setQueueTime(0);
      return;
    }
    if (isQueueing) {
      addToast('Cancel the current search before choosing another game.', 'warn');
      return;
    }
    socket.emit('join_queue', { mode });
    setQueueMode(mode);
    setIsQueueing(true);
    addToast(`Searching for a ${gameModes.find(game => game.mode === mode)?.title || 'ranked'} opponent...`, 'info');
  };

  const handleCreateRoom = (mode: ArenaMode, visibility: 'public' | 'private' = 'private') => {
    if (!token) {
      addToast('Please login to create a battle.', 'warn');
      return;
    }
    const socket = connectSocket(token);
    socket.emit('create_private_room', { mode, visibility });
  };

  const handleJoinRoom = () => {
    if (!token) {
      addToast('Please login to join a room.', 'warn');
      return;
    }
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/arena/lobby/${code}`);
  };

  const getRank = (elo: number) => {
    if (elo >= 2000) return { name: 'Grandmaster', color: '#F59E0B' };
    if (elo >= 1800) return { name: 'Master', color: '#8B5CF6' };
    if (elo >= 1500) return { name: 'Diamond', color: '#3B82F6' };
    if (elo >= 1200) return { name: 'Platinum', color: '#10B981' };
    if (elo >= 900) return { name: 'Gold', color: '#FBBF24' };
    if (elo >= 600) return { name: 'Silver', color: '#94A3B8' };
    return { name: 'Bronze', color: '#B45309' };
  };

  const rank = getRank(user?.elo || 1000);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--wb-bg)' }}>
      <Navbar />
      <ToastContainer />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 className="font-hand" style={{ fontSize: '3.5rem', fontWeight: 950, marginBottom: 8 }}>Battle Arena</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--wb-ink-light)', maxWidth: 760 }}>
            Choose the game first, then decide whether you want ranked matchmaking, a public room, or a private invite.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <GlassCard intensity="mid" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: rank.color + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: rank.color, border: `2px solid ${rank.color}`,
              }}>
                <Trophy size={40} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>{rank.name}</h3>
              <p style={{ color: 'var(--wb-ink-light)', marginBottom: 16 }}>Current ELO: {user?.elo || 1000}</p>
              <div style={{ height: 4, background: 'var(--wb-border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: '65%', height: '100%', background: rank.color }} />
              </div>
            </GlassCard>

            <GlassCard intensity="low" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Users size={18} color="var(--wb-blue)" />
                <span style={{ fontWeight: 600 }}>Active Now</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{onlineCount} Brawlers</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--wb-ink-light)', marginTop: 4 }}>Across all arena modes</p>
            </GlassCard>
          </aside>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(['ranked', 'public', 'private'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`wb-btn ${activeTab === tab ? 'wb-btn-primary' : ''}`}
                  style={{ textTransform: 'capitalize', padding: '12px 24px' }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'ranked' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                {gameModes.map(game => {
                  const searchingThisMode = isQueueing && queueMode === game.mode;
                  return (
                    <GlassCard key={game.mode} intensity="high" style={{ padding: 28, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 340 }}>
                      <div style={{ position: 'absolute', top: -30, right: -20, color: game.accent, opacity: 0.08 }}>
                        {game.icon}
                      </div>
                      <div style={{ width: 48, height: 48, borderRadius: 12, border: `2px solid ${game.accent}`, color: game.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                        {game.icon}
                      </div>
                      <h2 className="font-hand" style={{ fontSize: '2rem', marginBottom: 10 }}>{game.title}</h2>
                      <p style={{ color: 'var(--wb-ink)', fontWeight: 700, marginBottom: 10 }}>{game.summary}</p>
                      <p style={{ color: 'var(--wb-ink-light)', fontSize: '0.95rem', lineHeight: 1.5 }}>{game.rankedCopy}</p>

                      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
                        <AnimatePresence mode="wait">
                          {searchingThisMode ? (
                            <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <p style={{ color: 'var(--wb-ink-light)', marginBottom: 12 }}>
                                Searching {Math.floor(queueTime / 60)}:{(queueTime % 60).toString().padStart(2, '0')}
                              </p>
                              <button className="wb-btn" style={{ width: '100%' }} onClick={() => handleJoinQueue(game.mode)}>
                                Cancel Search
                              </button>
                            </motion.div>
                          ) : (
                            <motion.button
                              key="idle"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="wb-btn wb-btn-primary"
                              style={{ width: '100%' }}
                              onClick={() => handleJoinQueue(game.mode)}
                              disabled={isQueueing}
                            >
                              <Zap size={18} />
                              Find Ranked Match
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}

            {activeTab === 'public' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {gameModes.map(game => {
                  const rooms = publicRoomsByMode[game.mode];
                  return (
                    <GlassCard key={game.mode} intensity="mid" style={{ padding: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
                        <div style={{ maxWidth: 620 }}>
                          <h2 className="font-hand" style={{ fontSize: '2rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: game.accent }}>{game.icon}</span>
                            {game.title}
                          </h2>
                          <p style={{ color: 'var(--wb-ink-light)' }}>{game.publicCopy}</p>
                        </div>
                        <button className="wb-btn wb-btn-primary" onClick={() => handleCreateRoom(game.mode, 'public')}>
                          Create Public {game.shortTitle}
                        </button>
                      </div>

                      {rooms.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                          {rooms.map(room => (
                            <div key={room.code} className="wb-card" style={{ padding: 18, boxShadow: 'var(--shadow-sm)' }}>
                              <div style={{ fontWeight: 800, marginBottom: 6 }}>{room.host}&apos;s Room</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--wb-ink-light)', fontSize: '0.9rem', marginBottom: 16 }}>
                                <Users size={14} />
                                {room.playerCount}/{room.maxPlayers || 2} players
                              </div>
                              <button className="wb-btn wb-btn-green" style={{ width: '100%' }} onClick={() => router.push(`/arena/lobby/${room.code}`)}>
                                Join {game.shortTitle}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--wb-ink-faint)', fontSize: '0.95rem' }}>No public {game.title} rooms right now.</p>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            )}

            {activeTab === 'private' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <GlassCard intensity="mid" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 14 }}>Join with Code</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="wb-input"
                      style={{ flex: 1, letterSpacing: 4, fontWeight: 700, textAlign: 'center' }}
                    />
                    <button className="wb-btn wb-btn-primary" onClick={handleJoinRoom}>
                      <Play size={18} />
                    </button>
                  </div>
                </GlassCard>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                  {gameModes.map(game => (
                    <GlassCard key={game.mode} intensity="mid" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ color: game.accent }}>{game.icon}</div>
                      <h3 className="font-hand" style={{ fontSize: '1.7rem' }}>Private {game.title}</h3>
                      <p style={{ color: 'var(--wb-ink-light)', fontSize: '0.95rem' }}>{game.summary}</p>
                      <button className="wb-btn" style={{ width: '100%', marginTop: 'auto' }} onClick={() => handleCreateRoom(game.mode)}>
                        Create Invite Room
                      </button>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <h2 className="font-hand" style={{ fontSize: '2rem', marginBottom: 16 }}>What Each Game Means</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {gameModes.map(game => (
                  <GlassCard key={game.mode} intensity="low" style={{ padding: 20 }}>
                    <h4 style={{ fontWeight: 800, marginBottom: 8 }}>{game.title}</h4>
                    <p style={{ fontSize: '0.95rem', color: 'var(--wb-ink-light)', lineHeight: 1.5 }}>{game.summary}</p>
                  </GlassCard>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
