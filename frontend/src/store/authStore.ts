import { create } from 'zustand';
import { User } from '../types/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'vb_token';
const CONSENT_KEY = 'vb_cookies_accepted';

// Helper to manage cookies
const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  cookiesAccepted: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  guestLogin: (username: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  clearError: () => void;
  acceptCookies: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, 
  token: null, 
  loading: false, 
  error: null,
  cookiesAccepted: typeof window !== 'undefined' ? localStorage.getItem(CONSENT_KEY) === 'true' : false,

  clearError: () => set({ error: null }),

  acceptCookies: () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    set({ cookiesAccepted: true });
    // If there's a token in memory, move it to cookies now
    const currentToken = get().token;
    if (currentToken) setCookie(TOKEN_KEY, currentToken);
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      if (get().cookiesAccepted) {
        setCookie(TOKEN_KEY, data.token);
      }
      
      set({ user: data.user, token: data.token, loading: false });
    } catch (e: unknown) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Login failed' });
      throw e;
    }
  },

  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      if (get().cookiesAccepted) {
        setCookie(TOKEN_KEY, data.token);
      }
      
      set({ user: data.user, token: data.token, loading: false });
    } catch (e: unknown) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Registration failed' });
      throw e;
    }
  },

  guestLogin: async (username) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/auth/guest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Guest login failed');
      
      if (get().cookiesAccepted) {
        setCookie(TOKEN_KEY, data.token);
      }
      
      set({ user: data.user, token: data.token, loading: false });
    } catch (e: unknown) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Guest login failed' });
      throw e;
    }
  },

  logout: () => {
    deleteCookie(TOKEN_KEY);
    set({ user: null, token: null });
  },

  hydrate: async () => {
    if (typeof window === 'undefined') return;
    const token = getCookie(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); // Fallback to localStorage for migration
    if (!token) return;
    
    try {
      const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { 
        deleteCookie(TOKEN_KEY); 
        localStorage.removeItem(TOKEN_KEY);
        return; 
      }
      const { user } = await res.json();
      
      // If cookies are accepted, ensure it's in cookie
      if (get().cookiesAccepted) {
        setCookie(TOKEN_KEY, token);
      }
      
      set({ user, token });
    } catch { 
      deleteCookie(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  },
}));
