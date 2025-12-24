import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types'
import { getSessionId } from '@/utils/storage'
import {
  SOCKET_RECONNECTION_ATTEMPTS,
  SOCKET_RECONNECTION_DELAY,
} from '@/utils/constants'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TypedSocket | null = null

/**
 * Get the WebSocket URL with correct protocol
 */
function getSocketUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'
  }
  
  // In development with explicit server URL
  if (import.meta.env.VITE_SERVER_BASE_URL) {
    return import.meta.env.VITE_SERVER_BASE_URL
  }
  
  // In development mode, use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:3000'
  }
  
  // In production: construct URL with correct protocol
  // https: -> wss:, http: -> ws:
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  return `${protocol}//${window.location.host}`
}

/**
 * Get or create the socket connection
 */
export function getSocket(): TypedSocket {
  if (!socket) {
    const url = getSocketUrl()
    console.log('getSessionId()', getSessionId())
    console.log('[Socket] Connecting to:', url)
    
    socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: SOCKET_RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_RECONNECTION_DELAY,
      auth: {
        sessionId: getSessionId(),
      },
    })
  }
  return socket
}

/**
 * Connect to the socket server
 */
export function connectSocket(): TypedSocket {
  const s = getSocket()
  if (!s.connected) {
    // Update auth with current session ID before connecting
    s.auth = { sessionId: getSessionId() }
    s.connect()
  }
  return s
}

/**
 * Disconnect from the socket server
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

/**
 * Get the socket ID
 */
export function getSocketId(): string | undefined {
  return socket?.id
}

// Export types for convenience
export type { TypedSocket }
