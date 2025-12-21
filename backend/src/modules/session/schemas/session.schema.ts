/**
 * @fileoverview User Session Schema Definition
 * @description MongoDB schema for anonymous user sessions
 * @module modules/session/schemas/session
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateId } from '../../../common/utils/uuid.util';

/**
 * User Session Schema
 * 
 * @description Represents an anonymous user session with:
 * - UUID v7 for distributed ID generation
 * - Display name for chat identification
 * - Socket connection tracking
 * - Presence status (online/offline)
 * - Chat history references
 * 
 * Indexes:
 * - sessionId: unique for session lookup
 * - socketId: for WebSocket connection management
 * - isOnline: for active user queries
 * 
 * @class UserSession
 */
@Schema({
  timestamps: true,
  collection: 'user_sessions',
  toJSON: {
    virtuals: true,
    transform: (_, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class UserSession {
  @Prop({
    type: String,
    default: () => generateId(),
  })
  _id: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  sessionId: string;

  @Prop({
    type: String,
    required: false,
    default: null,
    index: true,
  })
  userId: string | null;

  @Prop({
    type: String,
    required: false,
    default: null,
    index: true,
  })
  socketId: string | null;

  @Prop({
    type: String,
    required: false,
    default: null,
  })
  currentRoomId: string | null;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isOnline: boolean;

  @Prop({
    type: Date,
    default: Date.now,
  })
  lastSeen: Date;

  @Prop({
    type: [String],
    default: [],
  })
  chatHistory: string[];

  @Prop({
    type: [String],
    default: [],
  })
  archivedChats: string[];

  // Timestamps added by Mongoose
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Session Document type for Mongoose
 */
export type UserSessionDocument = UserSession & Document;

/**
 * Create the Mongoose schema
 */
export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

/**
 * Index for online users in a specific room
 */
UserSessionSchema.index({ currentRoomId: 1, isOnline: 1 });

/**
 * TTL index for automatic session cleanup (30 days)
 */
UserSessionSchema.index(
  { lastSeen: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

/**
 * Instance method: Add room to chat history
 */
UserSessionSchema.methods.addToHistory = function (
  this: UserSessionDocument,
  roomId: string,
): void {
  if (!this.chatHistory.includes(roomId)) {
    this.chatHistory.push(roomId);
  }
};

/**
 * Instance method: Archive a chat
 */
UserSessionSchema.methods.archiveChat = function (
  this: UserSessionDocument,
  roomId: string,
): void {
  if (!this.archivedChats.includes(roomId)) {
    this.archivedChats.push(roomId);
  }
};

/**
 * Instance method: Remove from archived
 */
UserSessionSchema.methods.unarchiveChat = function (
  this: UserSessionDocument,
  roomId: string,
): void {
  this.archivedChats = this.archivedChats.filter((id) => id !== roomId);
};
