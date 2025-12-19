/**
 * @fileoverview Room Schema Definition
 * @description MongoDB schema for chat rooms with Mongoose
 * @module modules/room/schemas/room
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { generateId, generateRoomCode } from '@/common/utils/uuid.util';

/**
 * Room participant subdocument
 * 
 * @description Represents a user participating in the chat room
 */
@Schema({ _id: false })
export class Participant {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  leftAt: Date | null;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

/**
 * Room status enumeration
 */
export enum RoomStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

/**
 * Room Schema
 * 
 * @description Represents a chat room with the following features:
 * - UUID v7 for time-sortable distributed IDs
 * - 6-character room code for easy sharing
 * - Maximum 2 participants per room
 * - Status tracking (active/closed)
 * 
 * Indexes:
 * - roomCode: unique index for room lookup
 * - participants.userId: for user's room queries
 * - status + createdAt: for active room listings
 * 
 * @class Room
 */
@Schema({
  timestamps: true,
  collection: 'rooms',
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
export class Room {
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
    default: () => generateRoomCode(),
  })
  roomCode: string;

  @Prop({ type: [ParticipantSchema], default: [] })
  participants: Participant[];

  @Prop({
    type: String,
    enum: RoomStatus,
    default: RoomStatus.ACTIVE,
    index: true,
  })
  status: RoomStatus;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;

  // Timestamps added by Mongoose
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Room Document type for Mongoose
 */
export type RoomDocument = Room & Document;

/**
 * Create the Mongoose schema
 */
export const RoomSchema = SchemaFactory.createForClass(Room);

// Compound index for querying user's active rooms
RoomSchema.index({ 'participants.userId': 1, status: 1 });

// Index for room code lookups with status filter
RoomSchema.index({ roomCode: 1, status: 1 });

// Virtual property: Check if room is full (2 participants)
RoomSchema.virtual('isFull').get(function (this: RoomDocument) {
  return this.participants.length >= 2;
});

// Virtual property: Get count of active participants
RoomSchema.virtual('activeParticipantCount').get(function (this: RoomDocument) {
  return this.participants.filter((p) => p.isActive).length;
});

// Instance method: Check if a user is a participant
RoomSchema.methods.hasParticipant = function (
  this: RoomDocument,
  userId: string,
): boolean {
  return this.participants.some((p) => p.userId === userId);
};

// Instance method: Get participant by user ID
RoomSchema.methods.getParticipant = function (
  this: RoomDocument,
  userId: string,
): Participant | undefined {
  return this.participants.find((p) => p.userId === userId);
};

/**
 * Instance method: Check if room should be closed
 * (when both participants have left)
 */
RoomSchema.methods.shouldClose = function (this: RoomDocument): boolean {
  const activeCount = this.participants.filter((p) => p.isActive).length;
  return activeCount === 0 && this.participants.length === 2;
};
