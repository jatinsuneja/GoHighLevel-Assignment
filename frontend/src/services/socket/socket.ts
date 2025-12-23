import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types'
import { getSessionId } from '@/utils/storage'
import {
  SOCKET_RECONNECTION_ATTEMPTS,
  SOCKET_RECONNECTION_DELAY,
} from '@/utils/constants'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Use VITE_SERVER_BASE_URL for socket connection (same as API)
const SERVER_URL = import.meta.env.VITE_SERVER_BASE_URL || 'http://localhost:3000'

let socket: TypedSocket | null = null

/**
 * Get or create the socket connection
 * Backend uses /chat namespace for WebSocket events
 */
export function getSocket(): TypedSocket {
  if (!socket) {
    // Connect to the /chat namespace as defined in backend gateway
    socket = io(`${SERVER_URL}/chat`, {
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
