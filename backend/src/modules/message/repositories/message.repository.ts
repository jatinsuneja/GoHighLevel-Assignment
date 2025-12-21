/**
 * @fileoverview Message Repository
 * @description Data access layer for message operations using Repository Pattern
 * @module modules/message/repositories/message
 * 
 * Design Pattern: Repository Pattern
 * - Encapsulates data access logic for messages
 * - Provides cursor-based pagination for efficient retrieval
 * - Separates business logic from data persistence
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Message,
  MessageDocument,
  Reaction,
  ReactionType,
} from '../schemas/message.schema';

/**
 * Pagination options for message queries
 */
export interface PaginationOptions {
  limit: number;
  before?: string;
  after?: string;
}

/**
 * Paginated result structure
 */
export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

/**
 * Message Repository
 * 
 * @description Implements data access operations for messages:
 * - Create and save messages
 * - Paginated retrieval with cursor support
 * - Soft-delete operations
 * - Reaction management
 * 
 * @class MessageRepository
 */
@Injectable()
export class MessageRepository {
  private readonly logger = new Logger(MessageRepository.name);

  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  /**
   * Creates a new message
   * 
   * @param {Partial<Message>} messageData - Message data
   * @returns {Promise<MessageDocument>} Created message
   * 
   * @example
   * const message = await messageRepository.create({
   *   roomId: 'room-uuid',
   *   senderId: 'user-uuid',
   *   senderName: 'Anonymous User',
   *   content: 'Hello!',
   *   contentType: ContentType.TEXT
   * });
   */
  async create(messageData: Partial<Message>): Promise<MessageDocument> {
    this.logger.debug(`Creating message in room: ${messageData.roomId}`);

    const message = new this.messageModel(messageData);
    const savedMessage = await message.save();

    this.logger.debug(`Message created: ${savedMessage._id}`);
    return savedMessage;
  }

  /**
   * Finds a message by ID
   * 
   * @param {string} messageId - Message UUID
   * @returns {Promise<MessageDocument | null>} Message or null
   */
  async findById(messageId: string): Promise<MessageDocument | null> {
    return this.messageModel.findById(messageId).exec();
  }

  /**
   * Gets paginated messages for a room
   * 
   * @description Uses cursor-based pagination for efficient retrieval.
   * Messages are returned in descending order (newest first).
   * 
   * @param {string} roomId - Room UUID
   * @param {PaginationOptions} options - Pagination options
   * @returns {Promise<PaginatedResult<MessageDocument>>} Paginated messages
   * 
   * @example
   * // Get first page
   * const result = await messageRepository.getMessages('room-uuid', { limit: 50 });
   * 
   * // Get next page
   * const nextPage = await messageRepository.getMessages('room-uuid', {
   *   limit: 50,
   *   before: result.nextCursor
   * });
   */
  async getMessages(
    roomId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<MessageDocument>> {
    const { limit, before, after } = options;

    // Build query based on cursor
    const query: Record<string, unknown> = { roomId };

    if (before) {
      // Fetch messages older than cursor
      query._id = { $lt: before };
    } else if (after) {
      // Fetch messages newer than cursor
      query._id = { $gt: after };
    }

    // Fetch one extra to check if there are more
    const messages = await this.messageModel
      .find(query)
      .sort({ _id: after ? 1 : -1 }) // Ascending if fetching after, descending otherwise
      .limit(limit + 1)
      .exec();

    // Determine if there are more messages
    const hasMore = messages.length > limit;

    // Remove the extra message
    if (hasMore) {
      messages.pop();
    }

    // Reverse if we fetched in ascending order
    if (after) {
      messages.reverse();
    }

    // Determine cursors
    const nextCursor = hasMore && messages.length > 0
      ? messages[messages.length - 1]._id
      : undefined;

    const prevCursor = messages.length > 0 ? messages[0]._id : undefined;

    return {
      items: messages,
      hasMore,
      nextCursor,
      prevCursor,
    };
  }

  /**
   * Gets messages by sender
   * 
   * @param {string} senderId - Sender's user ID
   * @param {number} limit - Maximum messages to return
   * @returns {Promise<MessageDocument[]>} Array of messages
   */
  async getMessagesBySender(
    senderId: string,
    limit: number = 100,
  ): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ senderId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Soft-deletes a message
   * 
   * @param {string} messageId - Message UUID
   * @param {string} deletedBy - User ID who deleted the message
   * @param {string} deletedByName - Display name of the deleter
   * @returns {Promise<MessageDocument | null>} Updated message or null
   */
  async softDelete(
    messageId: string,
    deletedBy: string,
    deletedByName: string,
  ): Promise<MessageDocument | null> {
    this.logger.log(`Soft-deleting message: ${messageId}`);

    return this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          isDeleted: true,
          deletedBy,
          deletedByName,
          content: '', // Clear content for privacy
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Adds a reaction to a message
   * 
   * @param {string} messageId - Message UUID
   * @param {Reaction} reaction - Reaction to add
   * @returns {Promise<MessageDocument | null>} Updated message or null
   */
  async addReaction(
    messageId: string,
    reaction: Reaction,
  ): Promise<MessageDocument | null> {
    this.logger.debug(`Adding reaction ${reaction.type} to message: ${messageId}`);

    return this.messageModel
      .findByIdAndUpdate(
        messageId,
        { $push: { reactions: reaction } },
        { new: true },
      )
      .exec();
  }

  /**
   * Removes a reaction from a message
   * 
   * @param {string} messageId - Message UUID
   * @param {string} userId - User ID who added the reaction
   * @param {ReactionType} type - Reaction type to remove
   * @returns {Promise<MessageDocument | null>} Updated message or null
   */
  async removeReaction(
    messageId: string,
    userId: string,
    type: ReactionType,
  ): Promise<MessageDocument | null> {
    this.logger.debug(`Removing reaction ${type} from message: ${messageId}`);

    return this.messageModel
      .findByIdAndUpdate(
        messageId,
        { $pull: { reactions: { userId, type } } },
        { new: true },
      )
      .exec();
  }

  /**
   * Checks if a user has reacted to a message with a specific type
   * 
   * @param {string} messageId - Message UUID
   * @param {string} userId - User ID
   * @param {ReactionType} type - Reaction type
   * @returns {Promise<boolean>} True if user has reacted
   */
  async hasUserReacted(
    messageId: string,
    userId: string,
    type: ReactionType,
  ): Promise<boolean> {
    const count = await this.messageModel
      .countDocuments({
        _id: messageId,
        reactions: { $elemMatch: { userId, type } },
      })
      .exec();

    return count > 0;
  }

  /**
   * Gets the count of messages in a room
   * 
   * @param {string} roomId - Room UUID
   * @returns {Promise<number>} Message count
   */
  async countByRoom(roomId: string): Promise<number> {
    return this.messageModel.countDocuments({ roomId }).exec();
  }

  /**
   * Gets the latest message in a room
   * 
   * @param {string} roomId - Room UUID
   * @returns {Promise<MessageDocument | null>} Latest message or null
   */
  async getLatestMessage(roomId: string): Promise<MessageDocument | null> {
    return this.messageModel
      .findOne({ roomId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Saves a message document
   * 
   * @param {MessageDocument} message - Message to save
   * @returns {Promise<MessageDocument>} Saved message
   */
  async save(message: MessageDocument): Promise<MessageDocument> {
    return message.save();
  }
}
