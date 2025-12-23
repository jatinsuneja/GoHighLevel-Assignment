// Socket.io Event Types - matching backend gateway

import type { Message, Participant, ReactionCount } from './api.types'

// Client -> Server Events
export interface ClientToServerEvents {
  join_room: (payload: JoinRoomPayload) => void
  leave_room: (payload: LeaveRoomPayload) => void
  send_message: (payload: SendMessagePayload) => void
  typing: (payload: TypingPayload) => void
  delete_message: (payload: DeleteMessagePayload) => void
  add_reaction: (payload: AddReactionPayload) => void
  remove_reaction: (payload: RemoveReactionPayload) => void
}

// Server -> Client Events
export interface ServerToClientEvents {
  room_joined: (payload: RoomJoinedPayload) => void
  user_joined: (payload: UserJoinedPayload) => void
  user_left: (payload: UserLeftPayload) => void
  participants_updated: (payload: ParticipantsUpdatedPayload) => void
  new_message: (payload: Message) => void
  user_typing: (payload: UserTypingPayload) => void
  message_deleted: (payload: MessageDeletedPayload) => void
  reaction_updated: (payload: ReactionUpdatedPayload) => void
  room_closed: (payload: RoomClosedPayload) => void
  error: (payload: SocketErrorPayload) => void
}

// Payload Types for Client -> Server
export interface JoinRoomPayload {
  roomId: string
}

export interface LeaveRoomPayload {
  roomId: string
}

export interface SendMessagePayload {
  roomId: string
  content: string
  contentType?: 'text' | 'emoji'
}

export interface TypingPayload {
  roomId: string
  isTyping: boolean
}

export interface DeleteMessagePayload {
  roomId?: string
  messageId: string
}

export interface AddReactionPayload {
  roomId?: string
  messageId: string
  type: string
}

export interface RemoveReactionPayload {
  roomId?: string
  messageId: string
  type: string
}

// Payload Types for Server -> Client
export interface RoomJoinedPayload {
  roomId: string
  userId: string
  roomCode: string
  participants: ParticipantWithOnline[]
  recentMessages: Message[]
}

export interface ParticipantWithOnline extends Participant {
  isOnline: boolean
  lastSeenAt: string
}

export interface UserJoinedPayload {
  roomId?: string
  userId: string
  displayName: string
  timestamp?: string
  joinedAt?: string
}

export interface UserLeftPayload {
  roomId?: string
  userId: string
  displayName?: string
  timestamp?: string
}

export interface ParticipantsUpdatedPayload {
  roomId: string
  participants: ParticipantWithOnline[]
}

export interface UserTypingPayload {
  roomId: string
  userId: string
  displayName: string
  isTyping: boolean
}

export interface MessageDeletedPayload {
  messageId: string
  deletedBy: string
  placeholder: string
  timestamp: string
}

export interface ReactionUpdatedPayload {
  roomId: string
  messageId: string
  reactions: ReactionCount[]
}

export interface RoomClosedPayload {
  roomId: string
  closedAt: string
}

export interface SocketErrorPayload {
  message: string
  code?: string
}
