'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LucideSword as Sword, 
  LucideCopy as Copy, 
  LucideUsers as Users, 
  LucideLogOut as LogOut,
  LucideClock as Clock 
} from 'lucide-react';
import { Navbar } from '../../../../components/layout/Navbar';
import { ToastContainer } from '../../../../components/ui/Toast';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { useAuthStore } from '../../../../store/authStore';
import { useGameStore } from '../../../../store/gameStore';
import { connectSocket } from '../../../../lib/socket';

export default function ArenaRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const router = useRouter();
  const roomCode = params.roomCode;

  const { token, hydrate } = useAuthStore();
  const { addToast, setMatchStart, roomExpiresAt, setRoomExpiresAt } = useGameStore();
  const [connected, setConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [roomStatus, setRoomStatus] = useState('Waiting for an opponent to join the duel...');

  const joinedRef = useRef(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!token || !roomCode) return;

    const socket = connectSocket(token);

    const handleConnect = () => {
      setConnected(true);
      if (!joinedRef.current) {
        socket.emit('join_private_room', { roomCode });
        joinedRef.current = true;
      }
    };

    // Re-join if socket reconnects
    const handleReconnect = () => {
      joinedRef.current = false; // Allow join on reconnect
      handleConnect();
    };

    if (socket.connected) {
      handleConnect();
    }

    const handleDisconnect = () => {
      setConnected(false);
      joinedRef.current = false;
    };

    const handlePlayerJoined = ({ message }: { message?: string }) => {
      const nextMessage = message || 'Player joined the room. Starting the game...';
      setRoomStatus(nextMessage);
      addToast(nextMessage, 'success');
    };

    socket.on('connect', handleReconnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room_player_joined', handlePlayerJoined);

    socket.on('match_start', (payload) => {
      setMatchStart(payload);
      setRoomExpiresAt(null);
      addToast(`${payload.opponent?.username || 'Opponent'} joined. Starting the game...`, 'success');
      router.push(`/arena/${payload.matchId}`);
    });

    socket.on('room_expired', () => {
      addToast('Room has expired due to inactivity.', 'warn');
      setRoomExpiresAt(null);
      router.push('/arena');
    });

    socket.on('error_event', (msg: string) => {
      // If it's 'Room not found' but we already joined/redirected, ignore it
      if (msg.includes('not found') && joinedRef.current) return;
      
      addToast(msg, 'error');
      if (msg.includes('not found') || msg.includes('expired')) router.push('/arena');
    });

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room_player_joined', handlePlayerJoined);
      socket.off('match_start');
      socket.off('room_expired');
      socket.off('error_event');
    };
  }, [roomCode, token, router, setMatchStart, addToast, setRoomExpiresAt]);

  // Countdown Timer Logic
  useEffect(() => {
    if (!roomExpiresAt) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((roomExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [roomExpiresAt]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    addToast('Code copied to clipboard!', 'info');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--wb-bg)' }}>
      <Navbar />
      <ToastContainer />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <GlassCard intensity="high" style={{ width: '100%', maxWidth: 480, padding: 40, textAlign: 'center' }}>
          
          {/* Expiry Badge */}
          {timeLeft !== null && (
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 6, 
              padding: '6px 12px', background: timeLeft < 30 ? 'var(--wb-red)20' : 'var(--wb-border)',
              borderRadius: 20, color: timeLeft < 30 ? 'var(--wb-red)' : 'var(--wb-ink-light)',
              fontSize: '0.85rem', fontWeight: 600, marginBottom: 24
            }}>
              <Clock size={14} />
              Expires in: {formatTime(timeLeft)}
            </div>
          )}

          <div style={{ 
            width: 64, height: 64, borderRadius: '50%', background: 'var(--wb-indigo)20',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 20px', color: 'var(--wb-indigo)', border: '2px solid var(--wb-indigo)'
          }}>
            <Sword size={32} />
          </div>

          <h1 className="font-hand" style={{ fontSize: '2.2rem', marginBottom: 8 }}>Battle Room</h1>
          <p style={{ color: connected ? 'var(--wb-ink-light)' : 'var(--wb-amber)', marginBottom: 32, fontSize: '0.95rem' }}>
            {connected ? roomStatus : 'Connecting to room...'}
          </p>

          <div style={{ background: 'var(--wb-paper-alt)', padding: '20px 24px', borderRadius: 16, border: '2px solid var(--wb-border)', marginBottom: 32 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--wb-ink-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Room Code</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span className="font-hand" style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: 4, color: 'var(--wb-ink)' }}>{roomCode}</span>
              <button 
                onClick={copyCode}
                className="wb-btn wb-btn-sm" 
                style={{ padding: 6, minWidth: 'auto', borderRadius: 8 }}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--wb-ink-light)', fontSize: '0.9rem' }}>
            <div className="wb-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            <span>Looking for challengers...</span>
          </div>

          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--wb-border)' }}>
            <button className="wb-btn" style={{ width: '100%', fontSize: '0.95rem' }} onClick={() => router.push('/arena')}>
              <LogOut size={16} style={{ marginRight: 8 }} />
              Leave Room
            </button>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
