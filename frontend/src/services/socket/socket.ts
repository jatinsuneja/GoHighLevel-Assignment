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
 * Get or create the socket connection
 * Connects to default namespace (no custom namespace for simpler proxy setup)
 */
export function getSocket(): TypedSocket {
  if (!socket) {
    // In production, don't specify URL - Socket.IO will use current page's origin and protocol
    // This ensures wss:// is used when page is loaded over https://
    const socketOptions = {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: SOCKET_RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_RECONNECTION_DELAY,
      auth: {
        sessionId: getSessionId(),
      },
    }

    if (import.meta.env.PROD) {
      // In production: don't pass URL, Socket.IO defaults to current origin with correct protocol
      socket = io(socketOptions)
    } else if (import.meta.env.VITE_SERVER_BASE_URL) {
      // If explicit server URL is set
      socket = io(import.meta.env.VITE_SERVER_BASE_URL, socketOptions)
    } else {
      // Development default
      socket = io('http://localhost:3000', socketOptions)
    }
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
