// API Response Types

// Room Types
export interface Participant {
  userId: string
  displayName: string
  isActive: boolean
  joinedAt: string
  isOnline?: boolean
  lastSeenAt?: string
}

export interface CreateRoomRequest {
  displayName: string
  maxParticipants?: number
  expiresInHours?: number
}

export interface CreateRoomResponse {
  roomId: string
  roomCode: string
  createdAt: string
  expiresAt: string | null
}

export interface JoinRoomRequest {
  roomCode: string
  displayName: string
}

export interface RoomResponse {
  roomId: string
  roomCode: string
  participants: Participant[]
  status: 'active' | 'closed'
  createdAt: string
  closedAt?: string
}

// Generic API Response wrapper
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

// Error response
export interface ApiError {
  message: string
  statusCode: number
  error?: string
}
