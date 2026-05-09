import { create } from 'zustand';
import { LetterState, GuessResult, OpponentProgress, MatchStartPayload, GauntletResult, GameStatus, PlayerInfo } from '../types/game';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

interface ToastItem { id: number; message: string; type: 'error' | 'info' | 'success' | 'warn' }

interface GameState {
  matchId: string | null;
  status: GameStatus;
  guesses: GuessResult[];
  currentGuess: string;
  you: PlayerInfo | null;
  opponent: PlayerInfo | null;
  opponentProgress: OpponentProgress[];
  secretWord: string | null;
  winner: 'you' | 'opponent' | null;
  gauntletScore: number;
  gauntletTime: number;
  gauntletGuesses: GuessResult[];
  gauntletCurrentGuess: string;
  gauntletStatus: 'idle' | 'playing' | 'over';
  toasts: ToastItem[];
  shakeRow: number | null;
  onlineCount: number;
  roomExpiresAt: number | null;
  mode: 'brawl' | 'word_chain' | 'anagrams' | 'scribbl';
  scrambledWord: string | null;
  currentChainWord: string | null;
  scores: { you: number; opponent: number };
  chainHistory: { username: string; word: string }[];
  setMatchStart: (p: MatchStartPayload) => void;
  setCurrentGuess: (g: string) => void;
  addGuessResult: (r: GuessResult) => void;
  addOpponentProgress: (p: OpponentProgress) => void;
  setGauntletStarted: (ms: number) => void;
  setGauntletCurrentGuess: (g: string) => void;
  addGauntletResult: (r: GauntletResult) => void;
  addToast: (msg: string, type?: ToastItem['type']) => void;
  removeToast: (id: number) => void;
  setShakeRow: (row: number | null) => void;
  setOnlineCount: (count: number) => void;
  updateChain: (word: string, username: string, youScore: number, oppScore: number) => void;
  updateAnagram: (scrambled: string, username: string, youScore: number, oppScore: number) => void;
  resetGame: () => void;
  resetGauntlet: () => void;
  setRoomExpiresAt: (at: number | null) => void;
}

let _tid = 0;
const getInitState = () => ({
  matchId: null, 
  status: 'idle' as GameStatus, 
  guesses: [] as GuessResult[], 
  currentGuess: '',
  you: null as PlayerInfo | null, 
  opponent: null as PlayerInfo | null, 
  opponentProgress: [] as OpponentProgress[], 
  secretWord: null as string | null, 
  winner: null as 'you' | 'opponent' | null,
  gauntletScore: 0, 
  gauntletTime: 0, 
  gauntletGuesses: [] as GuessResult[],
  gauntletCurrentGuess: '', 
  gauntletStatus: 'idle' as const,
  toasts: [] as ToastItem[], 
  shakeRow: null as number | null, 
  onlineCount: 0,
  roomExpiresAt: null as number | null,
  mode: 'brawl' as const, 
  scrambledWord: null as string | null, 
  currentChainWord: null as string | null,
  scores: { you: 0, opponent: 0 }, 
  chainHistory: [] as { username: string; word: string }[],
});

export const useGameStore = create<GameState>((set, get) => ({
  ...getInitState(),

  setOnlineCount: (count: number) => set({ onlineCount: count }),

  setMatchStart: (p) => set({ 
    matchId: p.matchId, 
    status: 'playing', 
    you: p.you, 
    opponent: p.opponent, 
    guesses: [], 
    currentGuess: '', 
    opponentProgress: [], 
    secretWord: null, 
    winner: null,
    mode: p.mode || 'brawl',
    scores: { you: 0, opponent: 0 },
    chainHistory: [],
  }),

  updateChain: (word, username, youScore, oppScore) => set((s) => ({
    currentChainWord: word,
    chainHistory: [...s.chainHistory, { username, word }],
    scores: { you: youScore, opponent: oppScore },
  })),

  updateAnagram: (scrambled, username, youScore, oppScore) => set((s) => ({
    scrambledWord: scrambled,
    scores: { you: youScore, opponent: oppScore },
  })),

  setCurrentGuess: (g) => set({ currentGuess: g.substring(0, WORD_LENGTH).toUpperCase() }),

  addGuessResult: (r) => set((s) => {
    const guesses = [...s.guesses, r];
    const status: GameStatus = r.matchOver ? (r.winner === 'you' ? 'won' : 'lost') : guesses.length >= MAX_GUESSES && !r.won ? 'lost' : 'playing';
    return { guesses, currentGuess: '', status, winner: r.winner, secretWord: r.secretWord ?? s.secretWord };
  }),

  addOpponentProgress: (p) => set((s) => ({ opponentProgress: [...s.opponentProgress, p] })),

  setGauntletStarted: (ms) => set({ gauntletScore: 0, gauntletTime: ms, gauntletGuesses: [], gauntletCurrentGuess: '', gauntletStatus: 'playing' }),

  setGauntletCurrentGuess: (g) => set({ gauntletCurrentGuess: g.substring(0, WORD_LENGTH).toUpperCase() }),

  addGauntletResult: (r) => set((s) => {
    const entry: GuessResult = { guess: r.guess, result: r.result, guessNumber: s.gauntletGuesses.length + 1, won: r.won, matchOver: false, winner: null };
    return {
      gauntletGuesses: r.nextWord ? [] : [...s.gauntletGuesses, entry],
      gauntletCurrentGuess: '',
      gauntletScore: r.score,
      gauntletTime: r.timeLeftMs,
      gauntletStatus: r.gameOver ? 'over' : 'playing',
    };
  }),

  addToast: (message, type = 'info') => {
    const id = ++_tid;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  setShakeRow: (row) => {
    set({ shakeRow: row });
    if (row !== null) setTimeout(() => set({ shakeRow: null }), 600);
  },

  resetGame: () => set(getInitState()),
  resetGauntlet: () => set({ gauntletScore: 0, gauntletTime: 0, gauntletGuesses: [], gauntletCurrentGuess: '', gauntletStatus: 'idle' }),
  setRoomExpiresAt: (at) => set({ roomExpiresAt: at }),
}));
