/**
 * @fileoverview Message Schema Definition
 * @description MongoDB schema for chat messages with Mongoose
 * @module modules/message/schemas/message
 * 
 * Design Pattern: Schema Pattern (Mongoose)
 * - Defines the data structure for messages
 * - Supports reactions, soft-delete, and content types
 * - Optimized indexes for message retrieval
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateId } from '../../../common/utils/uuid.util';

/**
 * Reaction types enumeration
 */
export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  LAUGH = 'laugh',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry',
}

/**
 * Content type enumeration
 */
export enum ContentType {
  TEXT = 'text',
  EMOJI = 'emoji',
}

/**
 * Reaction subdocument
 * 
 * @description Represents a reaction on a message
 */
@Schema({ _id: false })
export class Reaction {
  @Prop({
    type: String,
    enum: ReactionType,
    required: true,
  })
  type: ReactionType;

  @Prop({ required: true })
  userId: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ReactionSchema = SchemaFactory.createForClass(Reaction);

/**
 * Message Schema
 * 
 * @description Represents a chat message with the following features:
 * - UUID v7 for time-sortable distributed IDs
 * - Support for text and emoji content types
 * - Soft-delete with placeholder message
 * - Multiple reactions per message
 * 
 * Indexes:
 * - roomId + createdAt: for paginated message retrieval
 * - senderId: for user message history
 * - isDeleted: for filtering deleted messages
 * 
 * @class Message
 */
@Schema({
  timestamps: true,
  collection: 'messages',
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
export class Message {
  @Prop({
    type: String,
    default: () => generateId(),
  })
  _id: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  roomId: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  senderId: string;

  @Prop({
    type: String,
    required: true,
  })
  senderName: string;

  @Prop({
    type: String,
    required: true,
  })
  content: string;

  @Prop({
    type: String,
    enum: ContentType,
    default: ContentType.TEXT,
  })
  contentType: ContentType;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isDeleted: boolean;

  @Prop({
    type: String,
    required: false,
    default: null,
  })
  deletedBy: string | null;

  @Prop({
    type: String,
    required: false,
    default: null,
  })
  deletedByName: string | null;

  @Prop({ type: [ReactionSchema], default: [] })
  reactions: Reaction[];

  // Timestamps added by Mongoose
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message Document type for Mongoose
 */
export type MessageDocument = Message & Document;

/**
 * Create the Mongoose schema
 */
export const MessageSchema = SchemaFactory.createForClass(Message);

/**
 * Compound index for paginated message retrieval
 */
MessageSchema.index({ roomId: 1, createdAt: -1 });

/**
 * Compound index for user's message history
 */
MessageSchema.index({ senderId: 1, createdAt: -1 });

/**
 * Virtual property: Get reaction counts by type
 */
MessageSchema.virtual('reactionCounts').get(function (this: MessageDocument) {
  const counts: Record<string, number> = {};
  
  for (const reaction of this.reactions) {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
  }
  
  return counts;
});

/**
 * Virtual property: Get deletion placeholder message
 */
MessageSchema.virtual('deletionPlaceholder').get(function (this: MessageDocument) {
  if (this.isDeleted && this.deletedByName) {
    return `Message deleted by ${this.deletedByName}`;
  }
  return null;
});

/**
 * Instance method: Check if a user has reacted with a specific type
 */
MessageSchema.methods.hasUserReacted = function (
  this: MessageDocument,
  userId: string,
  type: ReactionType,
): boolean {
  return this.reactions.some(
    (r) => r.userId === userId && r.type === type,
  );
};

/**
 * Instance method: Get a user's reactions on this message
 */
MessageSchema.methods.getUserReactions = function (
  this: MessageDocument,
  userId: string,
): ReactionType[] {
  return this.reactions
    .filter((r) => r.userId === userId)
    .map((r) => r.type);
};
