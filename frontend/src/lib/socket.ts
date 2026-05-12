import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL;
let _socket: Socket | null = null;
let _currentToken: string | null | undefined = undefined;

export function getSocket(): Socket | null { return _socket; }

export function connectSocket(token?: string | null): Socket {
  // If we already have a socket and the token hasn't changed, return the existing socket.
  // This prevents constantly destroying the socket while it's still connecting.
  if (_socket && _currentToken === token) return _socket;
  
  if (_socket) _socket.disconnect();
  
  _currentToken = token;
  _socket = io(SOCKET_URL, {
    autoConnect: true,
    // Allow polling fallback for hosts/proxies that block websocket-only handshakes.
    transports: ['websocket', 'polling'],
    auth: token ? { token } : {},
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });
  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}
