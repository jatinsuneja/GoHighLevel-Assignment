/**
 * @fileoverview History Service
 * @description Business logic for chat history management
 * @module modules/history/services/history
 * 
 * Design Pattern: Service Layer Pattern
 * - Aggregates data from Room and Message services
 * - Handles archive and delete operations
 * - Provides formatted history for UI display
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { RoomRepository } from '../../room/repositories/room.repository';
import { MessageRepository } from '../../message/repositories/message.repository';
import { SessionService } from '../../session/services/session.service';
import {
  ChatHistoryItemDto,
  ChatHistoryResponseDto,
} from '../dto/history.dto';
import {
  RoomNotFoundException,
  SessionNotFoundException,
} from '../../../common/exceptions/business.exceptions';

/**
 * History Service
 * 
 * @description Manages chat history with features:
 * - Retrieve all past chats with last message preview
 * - Archive/unarchive chats
 * - Delete chats from history (per-user)
 * 
 * @class HistoryService
 */
@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly messageRepository: MessageRepository,
    private readonly sessionService: SessionService,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {}

  /**
   * Gets chat history for a user
   * 
   * @description Retrieves all chats the user has participated in:
   * - Includes last message preview
   * - Shows other participant's name
   * - Filters based on archived status
   * 
   * @param {string} sessionId - User's session ID
   * @param {boolean} includeArchived - Include archived chats
   * @param {boolean} archivedOnly - Show only archived chats
   * @returns {Promise<ChatHistoryResponseDto>} Chat history
   * 
   * @example
   * const history = await historyService.getHistory('session-id', false, false);
   */
  async getHistory(
    sessionId: string,
    includeArchived: boolean = false,
    archivedOnly: boolean = false,
  ): Promise<ChatHistoryResponseDto> {
    this.logger.debug(`Getting history for session: ${sessionId}`);

    // Get user ID from session
    const userId = await this.sessionService.getUserId(sessionId);

    if (!userId) {
      throw new SessionNotFoundException();
    }

    // Get user's session for archived list
    const session = await this.sessionService.getSession(sessionId);
    const archivedRooms = new Set(session?.archivedChats || []);

    // Get all rooms the user participated in
    const rooms = await this.roomRepository.findUserRooms(userId);

    // Build history items with last message
    const historyItems: ChatHistoryItemDto[] = [];

    for (const room of rooms) {
      const isArchived = archivedRooms.has(room._id);

      // Filter based on archived status
      if (archivedOnly && !isArchived) continue;
      if (!includeArchived && !archivedOnly && isArchived) continue;

      // Get last message
      const lastMessage = await this.messageRepository.getLatestMessage(room._id);

      // Find other participant
      const otherParticipant = room.participants.find(
        (p) => p.userId !== userId,
      );

      // Build history item
      historyItems.push({
        roomId: room._id,
        roomCode: room.roomCode,
        otherParticipant: otherParticipant?.displayName || null,
        lastMessage: lastMessage?.isDeleted
          ? 'Message deleted'
          : lastMessage?.content?.slice(0, 100) || null,
        lastMessageAt: lastMessage?.createdAt || null,
        status: room.status,
        isArchived,
        createdAt: room.createdAt,
      });
    }

    // Sort by last message date (most recent first)
    historyItems.sort((a, b) => {
      const dateA = a.lastMessageAt?.getTime() || a.createdAt.getTime();
      const dateB = b.lastMessageAt?.getTime() || b.createdAt.getTime();
      return dateB - dateA;
    });

    return { chats: historyItems };
  }

  /**
   * Archives a chat
   * 
   * @param {string} sessionId - User's session ID
   * @param {string} roomId - Room to archive
   * @returns {Promise<{ roomId: string; isArchived: boolean }>}
   */
  async archiveChat(
    sessionId: string,
    roomId: string,
  ): Promise<{ roomId: string; isArchived: boolean }> {
    this.logger.log(`Archiving chat ${roomId} for session ${sessionId}`);

    // Validate room exists
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    // Archive in session
    await this.sessionService.archiveChat(sessionId, roomId);

    return { roomId, isArchived: true };
  }

  /**
   * Unarchives a chat
   * 
   * @param {string} sessionId - User's session ID
   * @param {string} roomId - Room to unarchive
   * @returns {Promise<{ roomId: string; isArchived: boolean }>}
   */
  async unarchiveChat(
    sessionId: string,
    roomId: string,
  ): Promise<{ roomId: string; isArchived: boolean }> {
    this.logger.log(`Unarchiving chat ${roomId} for session ${sessionId}`);

    await this.sessionService.unarchiveChat(sessionId, roomId);

    return { roomId, isArchived: false };
  }

  /**
   * Deletes a chat from user's history
   * 
   * @description This is a per-user operation:
   * - Removes from user's history view
   * - Does not delete the actual room or messages
   * - Other participant can still see the chat
   * 
   * @param {string} sessionId - User's session ID
   * @param {string} roomId - Room to delete from history
   * @returns {Promise<{ roomId: string; deleted: boolean }>}
   */
  async deleteFromHistory(
    sessionId: string,
    roomId: string,
  ): Promise<{ roomId: string; deleted: boolean }> {
    this.logger.log(`Deleting chat ${roomId} from history for session ${sessionId}`);

    await this.sessionService.removeFromHistory(sessionId, roomId);

    return { roomId, deleted: true };
  }
}
