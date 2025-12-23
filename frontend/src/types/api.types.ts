// API Response Types - matching backend DTOs

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

// Message Types
export interface ReactionCount {
  type: ReactionType
  count: number
  userReacted: boolean
}

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'

export interface Message {
  messageId: string
  roomId: string
  senderId: string
  senderName: string
  content: string
  contentType: 'text' | 'emoji'
  isDeleted: boolean
  deletedByName?: string
  reactions: ReactionCount[]
  createdAt: string
}

export interface SendMessageRequest {
  roomId: string
  content: string
  contentType?: 'text' | 'emoji'
}

export interface GetMessagesQuery {
  roomId: string
  limit?: number
  before?: string
  after?: string
}

export interface PaginatedMessages {
  messages: Message[]
  pagination: {
    hasMore: boolean
    nextCursor?: string
    prevCursor?: string
  }
}

export interface AddReactionRequest {
  type: ReactionType
}

export interface ReactionResponse {
  messageId: string
  reactions: ReactionCount[]
}

export interface DeleteMessageResponse {
  messageId: string
  isDeleted: boolean
  deletedBy: string
  placeholder: string
}

// History Types
export interface ChatHistoryItem {
  roomId: string
  roomCode: string
  otherParticipant: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  status: 'active' | 'closed'
  isArchived: boolean
  createdAt: string
}

export interface ChatHistoryResponse {
  chats: ChatHistoryItem[]
}

export interface GetHistoryQuery {
  includeArchived?: boolean
  archivedOnly?: boolean
}

export interface ArchiveChatResponse {
  roomId: string
  isArchived: boolean
}

export interface DeleteChatResponse {
  roomId: string
  deleted: boolean
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
