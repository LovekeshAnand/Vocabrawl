export type LetterState = 0 | 1 | 2 | null;

export interface GuessResult {
  guess: string;
  result: LetterState[];
  guessNumber: number;
  won: boolean;
  matchOver: boolean;
  winner: 'you' | 'opponent' | null;
  secretWord?: string;
}

export interface OpponentProgress {
  result: LetterState[];
  guessNumber: number;
  matchOver: boolean;
  winner: 'you' | 'opponent' | null;
  secretWord?: string;
}

export interface MatchStartPayload {
  matchId: string;
  you: { username: string; elo: number };
  opponent: { username: string; elo: number };
  wordLength: number;
  maxGuesses: number;
  mode?: 'brawl' | 'word_chain' | 'anagrams' | 'scribbl';
  scrambled?: string;
  currentWord?: string;
  targetScore?: number;
  endsAt?: number;
  nextTurnId?: string;
  ranked?: boolean;
}

export interface GauntletResult {
  guess: string;
  result: LetterState[];
  won: boolean;
  gameOver: boolean;
  nextWord: boolean | null;
  score: number;
  timeLeftMs: number;
  secretWord?: string;
}

export type GameStatus = 'idle' | 'queue' | 'playing' | 'won' | 'lost' | 'draw';

export interface PlayerInfo { username: string; elo: number; }
