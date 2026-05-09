export interface User {
  id: string;
  username: string;
  elo: number;
  gamesPlayed: number;
  gamesWon: number;
}
export interface AuthResponse { token: string; user: User; }
export interface LoginPayload { username: string; password: string; }
export interface RegisterPayload { username: string; password: string; }
