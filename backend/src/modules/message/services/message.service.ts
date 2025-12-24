/**
 * @fileoverview Message Service
 * @description Business logic layer for message operations
 * @module modules/message/services/message
 * 
 * Design Pattern: Service Layer Pattern
 * - Contains all business logic for message operations
 * - Orchestrates between repository, cache, and queue systems
 * - Validates permissions and throws domain exceptions
 */

import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { MessageRepository, PaginationOptions } from '../repositories/message.repository';
import { RoomService } from '../../room/services/room.service';
import {
  MessageDocument,
  Reaction,
  ReactionType,
  ContentType,
} from '../schemas/message.schema';
import {
  SendMessageDto,
  MessageResponseDto,
  ReactionCountDto,
  PaginatedMessagesResponseDto,
} from '../dto/message.dto';
import { generateId } from '../../../common/utils/uuid.util';
import {
  MessageNotFoundException,
  UserNotInRoomException,
  DuplicateReactionException,
} from '../../../common/exceptions/business.exceptions';

/**
 * Cache configuration
 */
const CACHE_KEYS = {
  MESSAGE: (id: string) => `message:${id}`,
  ROOM_MESSAGES: (roomId: string) => `room:${roomId}:messages`,
};

/**
 * Message Service
 * 
 * @description Handles all business logic for message operations:
 * - Sending messages with room validation
 * - Paginated message retrieval
 * - Soft-delete with placeholder messages
 * - Reaction management with duplicate prevention
 * - Queue-based persistence for scalability
 * 
 * @class MessageService
 */
@Injectable()
export class MessageService implements OnModuleInit {
  private readonly logger = new Logger(MessageService.name);
  
  // Cache TTL values and message limits from config
  private cacheTtlMessage: number;
  private defaultMessageLimit: number;

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly roomService: RoomService,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    @InjectQueue('message-persistence')
    private readonly messageQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.cacheTtlMessage = this.configService.get<number>('CACHE_TTL_MESSAGE', 1800);
    this.defaultMessageLimit = this.configService.get<number>('DEFAULT_MESSAGE_LIMIT', 50);
  }

  /**
   * Sends a message to a room
   * 
   * @description Creates a message with the following flow:
   * 1. Validates user is a participant in the room
   * 2. Gets user info from session
   * 3. Creates message in database
   * 4. Queues async tasks (if needed)
   * 5. Returns formatted message response
   * 
   * @param {string} sessionId - Sender's session ID
   * @param {SendMessageDto} dto - Message data
   * @returns {Promise<MessageResponseDto>} Created message
   * @throws {UserNotInRoomException} If user is not in the room
   * 
   * @example
   * const message = await messageService.sendMessage('session-uuid', {
   *   roomId: 'room-uuid',
   *   content: 'Hello!',
   *   contentType: 'text'
   * });
   */
  async sendMessage(
    sessionId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    this.logger.debug(`Sending message to room: ${dto.roomId}`);

    // Get user info and validate room participation
    const { userId, displayName } = await this.validateAndGetUserInfo(
      sessionId,
      dto.roomId,
    );

    // Create message
    const message = await this.messageRepository.create({
      roomId: dto.roomId,
      senderId: userId,
      senderName: displayName,
      content: dto.content,
      contentType: dto.contentType || ContentType.TEXT,
    });

    this.logger.log(`Message sent: ${message._id} to room ${dto.roomId}`);

    return this.mapToMessageResponse(message, userId);
  }

  /**
   * Gets paginated messages for a room
   * 
   * @param {string} sessionId - Requester's session ID
   * @param {string} roomId - Room to get messages from
   * @param {PaginationOptions} options - Pagination options
   * @returns {Promise<PaginatedMessagesResponseDto>} Paginated messages
   * @throws {UserNotInRoomException} If user is not in the room
   */
  async getMessages(
    sessionId: string,
    roomId: string,
    options: PaginationOptions,
  ): Promise<PaginatedMessagesResponseDto> {
    this.logger.debug(`Getting messages for room: ${roomId}`);

    // Validate user is in room
    const { userId } = await this.validateAndGetUserInfo(sessionId, roomId);

    // Get paginated messages
    const result = await this.messageRepository.getMessages(roomId, options);

    // Map to response DTOs
    const messages = result.items.map((msg) =>
      this.mapToMessageResponse(msg, userId),
    );

    return {
      messages,
      pagination: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
      },
    };
  }

  /**
   * Deletes a message (soft-delete)
   * 
   * @description Performs soft-delete:
   * - Marks message as deleted
   * - Clears content for privacy
   * - Shows placeholder: "Message deleted by <user>"
   * 
   * @param {string} sessionId - Requester's session ID
   * @param {string} messageId - Message to delete
   * @returns {Promise<MessageResponseDto>} Deleted message with placeholder
   * @throws {MessageNotFoundException} If message doesn't exist
   * @throws {UserNotInRoomException} If user is not in the room
   */
  async deleteMessage(
    sessionId: string,
    messageId: string,
  ): Promise<MessageResponseDto> {
    this.logger.log(`Deleting message: ${messageId}`);

    // Find message
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new MessageNotFoundException(messageId);
    }

    // Validate user is in room
    const { userId, displayName } = await this.validateAndGetUserInfo(
      sessionId,
      message.roomId,
    );

    // Soft delete
    const deletedMessage = await this.messageRepository.softDelete(
      messageId,
      userId,
      displayName,
    );

    if (!deletedMessage) {
      throw new MessageNotFoundException(messageId);
    }

    this.logger.log(`Message deleted: ${messageId} by ${displayName}`);

    return this.mapToMessageResponse(deletedMessage, userId);
  }

  /**
   * Adds a reaction to a message
   * 
   * @param {string} sessionId - Requester's session ID
   * @param {string} messageId - Message to react to
   * @param {ReactionType} type - Type of reaction
   * @returns {Promise<MessageResponseDto>} Updated message with reactions
   * @throws {MessageNotFoundException} If message doesn't exist
   * @throws {DuplicateReactionException} If user already reacted with this type
   */
  async addReaction(
    sessionId: string,
    messageId: string,
    type: ReactionType,
  ): Promise<MessageResponseDto> {
    this.logger.debug(`Adding reaction ${type} to message: ${messageId}`);

    // Find message
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new MessageNotFoundException(messageId);
    }

    // Validate user is in room
    const { userId } = await this.validateAndGetUserInfo(
      sessionId,
      message.roomId,
    );

    // Check for duplicate reaction
    const hasReacted = await this.messageRepository.hasUserReacted(
      messageId,
      userId,
      type,
    );

    if (hasReacted) {
      throw new DuplicateReactionException(type);
    }

    // Add reaction
    const reaction: Reaction = {
      type,
      userId,
      createdAt: new Date(),
    };

    const updatedMessage = await this.messageRepository.addReaction(
      messageId,
      reaction,
    );

    if (!updatedMessage) {
      throw new MessageNotFoundException(messageId);
    }

    // Queue async update for analytics (optional)
    await this.messageQueue.add('update-reactions', {
      messageId,
      reaction,
      action: 'add',
    });

    return this.mapToMessageResponse(updatedMessage, userId);
  }

  /**
   * Removes a reaction from a message
   * 
   * @param {string} sessionId - Requester's session ID
   * @param {string} messageId - Message to remove reaction from
   * @param {ReactionType} type - Type of reaction to remove
   * @returns {Promise<MessageResponseDto>} Updated message with reactions
   */
  async removeReaction(
    sessionId: string,
    messageId: string,
    type: ReactionType,
  ): Promise<MessageResponseDto> {
    this.logger.debug(`Removing reaction ${type} from message: ${messageId}`);

    // Find message
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new MessageNotFoundException(messageId);
    }

    // Get user ID
    const { userId } = await this.validateAndGetUserInfo(
      sessionId,
      message.roomId,
    );

    // Remove reaction
    const updatedMessage = await this.messageRepository.removeReaction(
      messageId,
      userId,
      type,
    );

    if (!updatedMessage) {
      throw new MessageNotFoundException(messageId);
    }

    return this.mapToMessageResponse(updatedMessage, userId);
  }

  /**
   * Gets a single message by ID
   * 
   * @param {string} sessionId - Requester's session ID
   * @param {string} messageId - Message ID
   * @returns {Promise<MessageResponseDto>} Message details
   */
  async getMessageById(
    sessionId: string,
    messageId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new MessageNotFoundException(messageId);
    }

    const { userId } = await this.validateAndGetUserInfo(
      sessionId,
      message.roomId,
    );

    return this.mapToMessageResponse(message, userId);
  }

  /**
   * Validates user is in room and gets their info
   * 
   * @private
   * @param {string} sessionId - User's session ID
   * @param {string} roomId - Room to validate against
   * @returns {Promise<{ userId: string; displayName: string }>} User info
   * @throws {UserNotInRoomException} If user is not in the room
   */
  private async validateAndGetUserInfo(
    sessionId: string,
    roomId: string,
  ): Promise<{ userId: string; displayName: string }> {
    // Get user ID from session
    const cachedUserId = await this.redisClient.get(`session:${sessionId}:userId`);

    if (!cachedUserId) {
      throw new UserNotInRoomException('unknown', roomId);
    }

    // Get room and find participant
    const room = await this.roomService.getRoomById(roomId);
    const participant = room.participants.find(
      (p) => p.userId === cachedUserId,
    );

    if (!participant) {
      throw new UserNotInRoomException(cachedUserId, roomId);
    }

    return {
      userId: cachedUserId,
      displayName: participant.displayName,
    };
  }

  /**
   * Maps a message document to response DTO
   * 
   * @private
   * @param {MessageDocument} message - Message document
   * @param {string} currentUserId - Current user's ID
   * @returns {MessageResponseDto} Mapped response
   */
  private mapToMessageResponse(
    message: MessageDocument,
    currentUserId: string,
  ): MessageResponseDto {
    // Build reaction counts
    const reactionCounts = this.buildReactionCounts(message, currentUserId);

    // Determine content to show
    const content = message.isDeleted
      ? ''
      : message.content;

    const deletionPlaceholder = message.isDeleted && message.deletedByName
      ? `Message deleted by ${message.deletedByName}`
      : undefined;

    return {
      messageId: message._id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: message.senderName,
      content,
      contentType: message.contentType,
      isDeleted: message.isDeleted,
      deletionPlaceholder,
      reactions: reactionCounts,
      createdAt: message.createdAt,
    };
  }

  /**
   * Builds reaction counts with user reaction status
   * 
   * @private
   * @param {MessageDocument} message - Message document
   * @param {string} currentUserId - Current user's ID
   * @returns {ReactionCountDto[]} Reaction counts
   */
  private buildReactionCounts(
    message: MessageDocument,
    currentUserId: string,
  ): ReactionCountDto[] {
    const counts: Record<string, { count: number; userReacted: boolean }> = {};

    // Only count reactions that actually exist
    for (const reaction of message.reactions || []) {
      if (!reaction.type) continue;
      
      if (!counts[reaction.type]) {
        counts[reaction.type] = { count: 0, userReacted: false };
      }
      counts[reaction.type].count++;
      if (reaction.userId === currentUserId) {
        counts[reaction.type].userReacted = true;
      }
    }

    // Only return reactions with count > 0
    return Object.entries(counts)
      .filter(([, data]) => data.count > 0)
      .map(([type, data]) => ({
        type: type as ReactionType,
        count: data.count,
        userReacted: data.userReacted,
      }));
  }
}
