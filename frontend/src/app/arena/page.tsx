'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LucideSword as Sword, 
  LucideZap as Zap, 
  LucideTrophy as Trophy, 
  LucideUsers as Users, 
  LucideSearch as Search, 
  LucidePlus as Plus, 
  LucidePlay as Play 
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { connectSocket } from '../../lib/socket';
import { ToastContainer } from '../../components/ui/Toast';

export default function ArenaLobbyPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { onlineCount, addToast, setMatchStart, setRoomExpiresAt } = useGameStore();
  
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'ranked' | 'private' | 'public'>('ranked');
  const [roomCode, setRoomCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('match_start', (payload) => {
      setMatchStart(payload);
      addToast('Match Found! Joining...', 'success');
      router.push(`/arena/${payload.matchId}`);
    });

    socket.on('private_room_created', ({ roomCode, expiresAt }) => {
      addToast('Room Created!', 'success');
      setRoomExpiresAt(expiresAt);
      router.push(`/arena/lobby/${roomCode}`);
    });

    socket.on('public_rooms', (rooms) => {
      setPublicRooms(rooms);
    });

    socket.on('lobbies_update', (rooms) => {
      setPublicRooms(rooms);
    });

    socket.on('error', (err) => {
      addToast(err.message || 'An error occurred', 'error');
      setIsQueueing(false);
    });

    // Request public rooms
    socket.emit('get_public_rooms');

    return () => {
      socket.off('match_start');
      socket.off('private_room_created');
      socket.off('public_rooms');
      socket.off('lobbies_update');
      socket.off('error');
    };
  }, [token, router, setMatchStart, addToast]);

  useEffect(() => {
    let timer: any;
    if (isQueueing) {
      timer = setInterval(() => setQueueTime(prev => prev + 1), 1000);
    } else {
      setQueueTime(0);
    }
    return () => clearInterval(timer);
  }, [isQueueing]);

  const handleJoinQueue = () => {
    if (!token) {
      addToast('Please login to join the ranked queue!', 'warn');
      return;
    }
    const socket = connectSocket(token);
    if (isQueueing) {
      socket.emit('leave_queue');
      setIsQueueing(false);
    } else {
      socket.emit('join_queue');
      setIsQueueing(true);
      addToast('Searching for an opponent...', 'info');
    }
  };

  const handleCreateRoom = (mode: string, visibility: 'public' | 'private' = 'private') => {
    if (!token) {
      addToast('Please login to create a battle!', 'warn');
      return;
    }
    const socket = connectSocket(token);
    socket.emit('create_private_room', { mode, visibility });
  };

  const handleJoinRoom = () => {
    if (!token) {
      addToast('Please login to join a room!', 'warn');
      return;
    }
    if (!roomCode) return;
    router.push(`/arena/lobby/${roomCode.toUpperCase()}`);
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
        
        {/* Header Section */}
        <div style={{ marginBottom: 40 }}>
          <h1 className="font-hand" style={{ fontSize: '3.5rem', fontWeight: 950, marginBottom: 8 }}>Battle Arena</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--wb-ink-light)' }}>
            Face off against word warriors in real-time. Rise through the ranks.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32, alignItems: 'start' }}>
          
          {/* Left: Stats & Rank */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <GlassCard intensity="mid" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ 
                width: 80, height: 80, borderRadius: '50%', background: rank.color + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                margin: '0 auto 16px', color: rank.color, border: `2px solid ${rank.color}`
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
              <p style={{ fontSize: '0.85rem', color: 'var(--wb-ink-light)', marginTop: 4 }}>Across all modes</p>
            </GlassCard>
          </div>

          {/* Right: Game Modes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 12 }}>
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

            {/* Ranked View */}
            {activeTab === 'ranked' && (
              <GlassCard intensity="high" style={{ padding: 60, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}>
                  <Zap size={300} />
                </div>
                
                <AnimatePresence mode="wait">
                  {!isQueueing ? (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <h2 className="font-hand" style={{ fontSize: '2.5rem', marginBottom: 16 }}>Ready for Battle?</h2>
                      <p style={{ color: 'var(--wb-ink-light)', maxWidth: 400, margin: '0 auto 40px', fontSize: '1.1rem' }}>
                        Match with an opponent near your ELO ({user?.elo || 1000}) and fight for the top of the leaderboard.
                      </p>
                      <button 
                        className="wb-btn wb-btn-primary wb-btn-lg"
                        style={{ padding: '24px 60px', fontSize: '1.5rem', borderRadius: 20 }}
                        onClick={handleJoinQueue}
                      >
                        <Zap size={24} style={{ marginRight: 12 }} />
                        Find Match
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="queue"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <div className="wb-spinner" style={{ width: 80, height: 80, borderTopColor: 'var(--wb-indigo)', margin: '0 auto 32px' }} />
                      <h2 className="font-hand" style={{ fontSize: '2.5rem', marginBottom: 8 }}>Searching...</h2>
                      <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.2rem', marginBottom: 40 }}>
                        Time in Queue: {Math.floor(queueTime / 60)}:{(queueTime % 60).toString().padStart(2, '0')}
                      </p>
                      <button 
                        className="wb-btn"
                        style={{ padding: '12px 32px' }}
                        onClick={handleJoinQueue}
                      >
                        Cancel Search
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            )}

            {/* Public Rooms View */}
            {activeTab === 'public' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {publicRooms.length > 0 ? publicRooms.map(room => (
                  <GlassCard key={room.code} intensity="mid" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{room.host}'s Battle</div>
                      <div style={{ padding: '4px 10px', background: 'var(--wb-blue)20', color: 'var(--wb-blue)', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
                        {room.mode.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--wb-ink-light)', fontSize: '0.9rem', marginBottom: 20 }}>
                      <Users size={14} />
                      {room.playerCount}/2 Players
                    </div>
                    <button 
                      className="wb-btn wb-btn-primary" 
                      style={{ width: '100%' }}
                      onClick={() => router.push(`/arena/lobby/${room.code}`)}
                    >
                      Join Battle
                    </button>
                  </GlassCard>
                )) : (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ color: 'var(--wb-ink-light)', fontSize: '1.2rem' }}>No public battles right now.</p>
                    <button className="wb-btn" style={{ marginTop: 16 }} onClick={() => handleCreateRoom('brawl', 'public')}>Create One</button>
                  </div>
                )}
              </div>
            )}

            {/* Private View */}
            {activeTab === 'private' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <GlassCard intensity="mid" style={{ padding: 32 }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16 }}>Join with Code</h3>
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

                <GlassCard intensity="mid" style={{ padding: 32 }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16 }}>Create Battle</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="wb-btn" style={{ flex: 1 }} onClick={() => handleCreateRoom('brawl')}>
                      Brawl
                    </button>
                    <button className="wb-btn" style={{ flex: 1 }} onClick={() => handleCreateRoom('word_chain')}>
                      Chain
                    </button>
                    <button className="wb-btn" style={{ flex: 1 }} onClick={() => handleCreateRoom('anagrams')}>
                      Anagrams
                    </button>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Instructions */}
            <div style={{ marginTop: 40 }}>
              <h2 className="font-hand" style={{ fontSize: '2rem', marginBottom: 20 }}>Arena Handbook</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <GlassCard intensity="low" style={{ padding: 24 }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 12 }}>⚔️ Ranked Brawl</h4>
                  <p style={{ fontSize: '0.95rem', color: 'var(--wb-ink-light)', lineHeight: 1.5 }}>
                    The ultimate 1v1 test. Both players solve the same word. The fastest solver wins more ELO points. Use the ghost board to track your opponent's progress!
                  </p>
                </GlassCard>
                <GlassCard intensity="low" style={{ padding: 24 }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 12 }}>⛓️ Word Chain</h4>
                  <p style={{ fontSize: '0.95rem', color: 'var(--wb-ink-light)', lineHeight: 1.5 }}>
                    Submit a word that starts with the last letter of your opponent's word. Speed is key—don't let the timer run out!
                  </p>
                </GlassCard>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
