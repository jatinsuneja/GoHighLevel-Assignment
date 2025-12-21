/**
 * @fileoverview Message Controller
 * @description REST API endpoints for message operations
 * @module modules/message/controllers/message
 * 
 * Design Pattern: Controller Pattern
 * - Handles HTTP requests and responses
 * - Validates input using DTOs
 * - Delegates business logic to service layer
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MessageService } from '../services/message.service';
import {
  SendMessageDto,
  GetMessagesQueryDto,
  AddReactionDto,
  MessageResponseDto,
  PaginatedMessagesResponseDto,
  DeleteMessageResponseDto,
  ReactionResponseDto,
} from '../dto/message.dto';
import { ReactionType } from '../schemas/message.schema';
import { SessionNotFoundException } from '../../../common/exceptions/business.exceptions';

/**
 * Message Controller
 * 
 * @description Exposes REST API endpoints for message management:
 * - POST /messages - Send a new message
 * - GET /messages - Get paginated messages
 * - DELETE /messages/:messageId - Delete a message
 * - POST /messages/:messageId/reactions - Add a reaction
 * - DELETE /messages/:messageId/reactions/:type - Remove a reaction
 * 
 * @class MessageController
 */
@Controller('messages')
export class MessageController {
  private readonly logger = new Logger(MessageController.name);

  constructor(private readonly messageService: MessageService) {}

  /**
   * Sends a new message to a room
   * 
   * @route POST /messages
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {SendMessageDto} dto - Message data
   * @returns {Promise<MessageResponseDto>} Created message
   * 
   * @example
   * // Request
   * POST /api/v1/messages
   * Headers: { "X-Session-Id": "session-uuid" }
   * Body: { "roomId": "xxx", "content": "Hello!", "contentType": "text" }
   * 
   * // Response 201
   * {
   *   "messageId": "...",
   *   "roomId": "...",
   *   "content": "Hello!",
   *   "senderName": "Anonymous User",
   *   ...
   * }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Headers('x-session-id') sessionId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Sending message to room: ${dto.roomId}`);

    return this.messageService.sendMessage(sessionId, dto);
  }

  /**
   * Gets paginated messages for a room
   * 
   * @route GET /messages
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {GetMessagesQueryDto} query - Query parameters
   * @returns {Promise<PaginatedMessagesResponseDto>} Paginated messages
   * 
   * @example
   * // Request
   * GET /api/v1/messages?roomId=xxx&limit=50&before=cursor
   * Headers: { "X-Session-Id": "session-uuid" }
   * 
   * // Response 200
   * {
   *   "messages": [...],
   *   "pagination": { "hasMore": true, "nextCursor": "..." }
   * }
   */
  @Get()
  async getMessages(
    @Headers('x-session-id') sessionId: string,
    @Query() query: GetMessagesQueryDto,
  ): Promise<PaginatedMessagesResponseDto> {
    this.validateSessionId(sessionId);

    return this.messageService.getMessages(sessionId, query.roomId, {
      limit: query.limit || 50,
      before: query.before,
      after: query.after,
    });
  }

  /**
   * Gets a single message by ID
   * 
   * @route GET /messages/:messageId
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} messageId - Message UUID
   * @returns {Promise<MessageResponseDto>} Message details
   */
  @Get(':messageId')
  async getMessage(
    @Headers('x-session-id') sessionId: string,
    @Param('messageId') messageId: string,
  ): Promise<MessageResponseDto> {
    this.validateSessionId(sessionId);

    return this.messageService.getMessageById(sessionId, messageId);
  }

  /**
   * Deletes a message (soft-delete)
   * 
   * @route DELETE /messages/:messageId
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} messageId - Message UUID
   * @returns {Promise<DeleteMessageResponseDto>} Deletion confirmation
   * 
   * @example
   * // Request
   * DELETE /api/v1/messages/xxx
   * Headers: { "X-Session-Id": "session-uuid" }
   * 
   * // Response 200
   * {
   *   "messageId": "xxx",
   *   "isDeleted": true,
   *   "deletedBy": "Anonymous User",
   *   "placeholder": "Message deleted by Anonymous User"
   * }
   */
  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Headers('x-session-id') sessionId: string,
    @Param('messageId') messageId: string,
  ): Promise<DeleteMessageResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Deleting message: ${messageId}`);

    const message = await this.messageService.deleteMessage(sessionId, messageId);

    return {
      messageId: message.messageId,
      isDeleted: true,
      deletedBy: message.senderName,
      placeholder: message.deletionPlaceholder || 'Message deleted',
    };
  }

  /**
   * Adds a reaction to a message
   * 
   * @route POST /messages/:messageId/reactions
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} messageId - Message UUID
   * @param {AddReactionDto} dto - Reaction data
   * @returns {Promise<ReactionResponseDto>} Updated reactions
   * 
   * @example
   * // Request
   * POST /api/v1/messages/xxx/reactions
   * Headers: { "X-Session-Id": "session-uuid" }
   * Body: { "type": "like" }
   * 
   * // Response 201
   * {
   *   "messageId": "xxx",
   *   "reactions": [
   *     { "type": "like", "count": 1, "userReacted": true }
   *   ]
   * }
   */
  @Post(':messageId/reactions')
  @HttpCode(HttpStatus.CREATED)
  async addReaction(
    @Headers('x-session-id') sessionId: string,
    @Param('messageId') messageId: string,
    @Body() dto: AddReactionDto,
  ): Promise<ReactionResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.debug(`Adding reaction ${dto.type} to message: ${messageId}`);

    const message = await this.messageService.addReaction(
      sessionId,
      messageId,
      dto.type,
    );

    return {
      messageId: message.messageId,
      reactions: message.reactions,
    };
  }

  /**
   * Removes a reaction from a message
   * 
   * @route DELETE /messages/:messageId/reactions/:type
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} messageId - Message UUID
   * @param {string} type - Reaction type to remove
   * @returns {Promise<ReactionResponseDto>} Updated reactions
   * 
   * @example
   * // Request
   * DELETE /api/v1/messages/xxx/reactions/like
   * Headers: { "X-Session-Id": "session-uuid" }
   * 
   * // Response 200
   * {
   *   "messageId": "xxx",
   *   "reactionRemoved": "like"
   * }
   */
  @Delete(':messageId/reactions/:type')
  @HttpCode(HttpStatus.OK)
  async removeReaction(
    @Headers('x-session-id') sessionId: string,
    @Param('messageId') messageId: string,
    @Param('type') type: ReactionType,
  ): Promise<ReactionResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.debug(`Removing reaction ${type} from message: ${messageId}`);

    const message = await this.messageService.removeReaction(
      sessionId,
      messageId,
      type,
    );

    return {
      messageId: message.messageId,
      reactions: message.reactions,
    };
  }

  /**
   * Validates that a session ID is present
   * 
   * @private
   * @param {string} sessionId - Session ID to validate
   * @throws {SessionNotFoundException} If session ID is missing
   */
  private validateSessionId(sessionId: string): void {
    if (!sessionId) {
      throw new SessionNotFoundException();
    }
  }
}
