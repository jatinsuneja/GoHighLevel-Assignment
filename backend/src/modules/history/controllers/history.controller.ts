/**
 * @fileoverview History Controller
 * @description REST API endpoints for chat history management
 * @module modules/history/controllers/history
 * 
 * Design Pattern: Controller Pattern
 * - Handles HTTP requests for history operations
 * - Validates input and delegates to service
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HistoryService } from '../services/history.service';
import {
  GetHistoryQueryDto,
  ChatHistoryResponseDto,
  ArchiveChatResponseDto,
  DeleteChatResponseDto,
} from '../dto/history.dto';
import { SessionNotFoundException } from '../../../common/exceptions/business.exceptions';

/**
 * History Controller
 * 
 * @description Exposes REST API endpoints for history management:
 * - GET /history - Get user's chat history
 * - POST /history/:roomId/archive - Archive a chat
 * - POST /history/:roomId/unarchive - Unarchive a chat
 * - DELETE /history/:roomId - Delete chat from history
 * 
 * @class HistoryController
 */
@Controller('history')
export class HistoryController {
  private readonly logger = new Logger(HistoryController.name);

  constructor(private readonly historyService: HistoryService) {}

  /**
   * Gets user's chat history
   * 
   * @route GET /history
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {GetHistoryQueryDto} query - Query parameters
   * @returns {Promise<ChatHistoryResponseDto>} Chat history
   * 
   * @example
   * // Request
   * GET /api/v1/history?includeArchived=false
   * Headers: { "X-Session-Id": "session-uuid" }
   * 
   * // Response 200
   * {
   *   "chats": [
   *     {
   *       "roomId": "...",
   *       "roomCode": "ABC123",
   *       "otherParticipant": "Anonymous User 2",
   *       "lastMessage": "See you!",
   *       "lastMessageAt": "2025-12-18T10:00:00.000Z",
   *       "status": "closed",
   *       "isArchived": false
   *     }
   *   ]
   * }
   */
  @Get()
  async getHistory(
    @Headers('x-session-id') sessionId: string,
    @Query() query: GetHistoryQueryDto,
  ): Promise<ChatHistoryResponseDto> {
    this.validateSessionId(sessionId);

    return this.historyService.getHistory(
      sessionId,
      query.includeArchived,
      query.archivedOnly,
    );
  }

  /**
   * Archives a chat
   * 
   * @route POST /history/:roomId/archive
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} roomId - Room ID to archive
   * @returns {Promise<ArchiveChatResponseDto>} Archive confirmation
   * 
   * @example
   * // Request
   * POST /api/v1/history/xxx/archive
   * Headers: { "X-Session-Id": "session-uuid" }
   * 
   * // Response 200
   * { "roomId": "xxx", "isArchived": true }
   */
  @Post(':roomId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveChat(
    @Headers('x-session-id') sessionId: string,
    @Param('roomId') roomId: string,
  ): Promise<ArchiveChatResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Archiving chat: ${roomId}`);

    return this.historyService.archiveChat(sessionId, roomId);
  }

  /**
   * Unarchives a chat
   * 
   * @route POST /history/:roomId/unarchive
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} roomId - Room ID to unarchive
   * @returns {Promise<ArchiveChatResponseDto>} Unarchive confirmation
   */
  @Post(':roomId/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchiveChat(
    @Headers('x-session-id') sessionId: string,
    @Param('roomId') roomId: string,
  ): Promise<ArchiveChatResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Unarchiving chat: ${roomId}`);

    return this.historyService.unarchiveChat(sessionId, roomId);
  }

  /**
   * Deletes a chat from user's history
   * 
   * @route DELETE /history/:roomId
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} roomId - Room ID to delete
   * @returns {Promise<DeleteChatResponseDto>} Delete confirmation
   * 
   * @example
   * // Request
   * DELETE /api/v1/history/xxx
   * Headers: { "X-Session-Id": "session-uuid" }
   * 
   * // Response 200
   * { "roomId": "xxx", "deleted": true }
   */
  @Delete(':roomId')
  @HttpCode(HttpStatus.OK)
  async deleteFromHistory(
    @Headers('x-session-id') sessionId: string,
    @Param('roomId') roomId: string,
  ): Promise<DeleteChatResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Deleting chat from history: ${roomId}`);

    return this.historyService.deleteFromHistory(sessionId, roomId);
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
