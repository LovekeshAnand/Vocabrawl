import { create } from 'zustand';

interface ScribblPlayer {
  socketId: string;
  username: string;
  score: number;
  isHost: boolean;
  solved: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  system: boolean;
}

interface ScribblState {
  lobbyId: string | null;
  status: 'waiting' | 'playing' | 'finished';
  players: ScribblPlayer[];
  drawer: string | null; // socketId of the drawer
  isDrawer: boolean;
  hint: string | null;
  secretWord: string | null; // Only known if you are the drawer
  round: number;
  totalRounds: number;
  chat: ChatMessage[];
  durationMs: number;
  timeLeft: number;
  turnEndData: any | null;

  setLobby: (data: any) => void;
  updatePlayers: (players: ScribblPlayer[]) => void;
  startTurn: (data: any, socketId: string) => void;
  updateHint: (hint: string) => void;
  setSecretWord: (word: string | null) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  updateScores: (scores: Record<string, number>) => void;
  markPlayerSolved: (socketId: string) => void;
  endTurn: (data: any) => void;
  updateTimeLeft: (ms: number) => void;
  resetGame: () => void;
}

const getInitState = () => ({
  lobbyId: null,
  status: 'waiting' as const,
  players: [] as ScribblPlayer[],
  drawer: null,
  isDrawer: false,
  hint: null,
  secretWord: null,
  round: 0,
  totalRounds: 3,
  chat: [] as ChatMessage[],
  durationMs: 80000,
  timeLeft: 80000,
  turnEndData: null,
});

export const useScribblStore = create<ScribblState>((set, get) => ({
  ...getInitState(),

  setLobby: (data) => set({
    lobbyId: data.id,
    status: data.status,
    players: [...data.players],
    round: data.round,
    totalRounds: data.totalRounds,
    hint: data.hint,
  }),

  updatePlayers: (players) => set({ players }),

  startTurn: (data, socketId) => set({
    status: 'playing',
    drawer: data.drawer,
    isDrawer: data.drawer === socketId,
    hint: data.hint,
    round: data.round,
    totalRounds: data.totalRounds,
    durationMs: data.durationMs,
    timeLeft: data.durationMs,
    players: data.players,
    turnEndData: null,
    chat: [], // clear chat on new turn
  }),

  updateHint: (hint) => set({ hint }),
  setSecretWord: (word) => set({ secretWord: word }),

  addChatMessage: (msg) => set((s) => ({
    chat: [...s.chat, { ...msg, id: Math.random().toString(36).substring(2, 11) }].slice(-50), // keep last 50
  })),

  updateScores: (scores) => set((s) => ({
    players: s.players.map((p) => ({ ...p, score: scores[p.socketId] ?? p.score })),
  })),

  markPlayerSolved: (socketId) => set((s) => ({
    players: s.players.map((p) => p.socketId === socketId ? { ...p, solved: true } : p),
  })),

  endTurn: (data) => set({ turnEndData: data, status: data.gameOver ? 'finished' : 'playing' }),

  updateTimeLeft: (ms) => set({ timeLeft: ms }),

  resetGame: () => set(getInitState()),
}));
