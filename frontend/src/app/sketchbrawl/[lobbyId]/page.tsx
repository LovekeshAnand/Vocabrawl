'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../components/layout/Navbar';
import { ToastContainer } from '../../../components/ui/Toast';
import { useSketchBrawlStore } from '../../../store/sketchBrawlStore';
import { useAuthStore } from '../../../store/authStore';
import { useGameStore } from '../../../store/gameStore';
import { connectSocket } from '../../../lib/socket';
import { SketchBrawlUI } from '../../../components/game/SketchBrawlUI';

export default function SketchBrawlPage() {
  const params = useParams<{ lobbyId: string }>();
  const router = useRouter();
  const lobbyId = params.lobbyId;

  const { token, hydrate } = useAuthStore();
  const { addToast } = useGameStore();
  const store = useSketchBrawlStore();
  const [connected, setConnected] = useState(false);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { 
    hydrate().then(() => setHydrated(true)); 
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const socket = connectSocket(token);

    const handleConnect = () => {
      setConnected(true);
      if (lobbyId) socket.emit('scribbl_join_lobby', { lobbyId });
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', () => setConnected(false));

    socket.on('error_event', (msg: string) => {
      addToast(msg, 'error');
      if (msg.includes('Login')) {
        router.push('/login');
      } else if (msg.includes('Lobby not found')) {
        router.push('/lobbies');
      }
      // Other errors (like 'Need 2 players' or 'Already playing') 
      // just stay on the page so the user can fix the condition.
    });

    socket.on('scribbl_lobby_joined', ({ lobby }) => store.setLobby(lobby));
    socket.on('scribbl_player_joined', ({ lobby }) => {
      store.updatePlayers(lobby.players);
      addToast('A new player joined!', 'info');
    });
    socket.on('scribbl_player_left', ({ lobby }) => store.updatePlayers(lobby.players));
    socket.on('scribbl_lobby_disbanded', () => {
      addToast('Lobby disbanded.', 'error');
      router.push('/lobbies');
    });

    socket.on('scribbl_turn_start', (data) => store.startTurn(data, socket.id as string));
    socket.on('scribbl_drawer_word', ({ word, secretWord }) => {
      if (word) store.updateHint(word); // It's actually the hint
      if (secretWord) store.setSecretWord(secretWord);
    });

    socket.on('scribbl_chat_msg', (msg) => {
      store.addChatMessage(msg);
      if (msg.scores) store.updateScores(msg.scores);
    });
    
    socket.on('scribbl_solved', ({ scoreDelta, scores }) => {
      store.addChatMessage({ sender: 'System', message: `You got it! (+${scoreDelta} pts)`, system: true });
      store.markPlayerSolved(socket.id as string);
      if (scores) store.updateScores(scores);
    });

    socket.on('scribbl_turn_end', (data) => {
      store.endTurn(data);
      store.addChatMessage({ sender: 'System', message: `Round over! The word was: ${data.secretWord}`, system: true });
    });

    // Handle timer locally to avoid spamming the network
    let timerInterval: NodeJS.Timeout;
    if (store.status === 'playing') {
      timerInterval = setInterval(() => {
        store.updateTimeLeft(Math.max(0, useSketchBrawlStore.getState().timeLeft - 1000));
      }, 1000);
    }

    return () => {
      socket.off('scribbl_lobby_joined');
      socket.off('scribbl_player_joined');
      socket.off('scribbl_player_left');
      socket.off('scribbl_lobby_disbanded');
      socket.off('scribbl_turn_start');
      socket.off('scribbl_drawer_word');
      socket.off('scribbl_chat_msg');
      socket.off('scribbl_solved');
      socket.off('scribbl_turn_end');
      socket.off('error_event');
      clearInterval(timerInterval);
    };
  }, [lobbyId, token, store.status, hydrated]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--wb-bg)' }}>
      <Navbar />
      <ToastContainer />
      
      {!connected && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <span className="font-hand" style={{ color: 'var(--wb-red)', fontSize: '1.2rem' }}>⚠️ Reconnecting...</span>
        </div>
      )}

      <main style={{ flex: 1, padding: '24px 16px', width: '100%' }}>
        <SketchBrawlUI />
      </main>
    </div>
  );
}
