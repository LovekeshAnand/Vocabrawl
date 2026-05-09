import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
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
    transports: ['websocket'],
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
