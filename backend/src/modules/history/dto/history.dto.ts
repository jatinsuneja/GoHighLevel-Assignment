/**
 * @fileoverview History DTOs (Data Transfer Objects)
 * @description Request and response DTOs for history operations
 * @module modules/history/dto
 * 
 * Design Considerations:
 * - Validation with class-validator decorators
 * - Transform decorators for query string parsing
 * - Swagger/OpenAPI documentation ready
 * - Type-safe response structures
 */

import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Get History Query DTO
 * 
 * @description Query parameters for history retrieval
 * Supports flexible filtering:
 * - Default: Active (non-archived) chats only
 * - includeArchived=true: All chats
 * - archivedOnly=true: Archived chats only
 */
export class GetHistoryQueryDto {
  /**
   * Include archived chats in the response
   * @default false
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeArchived?: boolean = false;

  /**
   * Return only archived chats
   * @default false
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  archivedOnly?: boolean = false;
}

/**
 * Chat History Item Response DTO
 * 
 * @description Represents a single chat in the user's history
 * with all necessary metadata for UI display
 */
export class ChatHistoryItemDto {
  /**
   * Unique room identifier (MongoDB ObjectId as string)
   */
  roomId: string;

  /**
   * 6-character alphanumeric room code
   */
  roomCode: string;

  /**
   * Display name of the other participant
   * Null if user is alone in the room
   */
  otherParticipant: string | null;

  /**
   * Preview of the last message (truncated to 100 chars)
   * Shows "Message deleted" for deleted messages
   * Null if no messages in the room
   */
  lastMessage: string | null;

  /**
   * ISO timestamp of the last message
   * Null if no messages in the room
   */
  lastMessageAt: string | null;

  /**
   * Current room status
   * - 'active': Room is open for messaging
   * - 'closed': Room has been closed
   */
  status: 'active' | 'closed';

  /**
   * Whether this chat is archived by the current user
   * Per-user setting - doesn't affect other participant
   */
  isArchived: boolean;

  /**
   * ISO timestamp when the room was created
   */
  createdAt: string;

  /**
   * Total number of messages in the room
   * Useful for display/statistics
   */
  messageCount: number;

  /**
   * Number of messages since user's last visit
   * For "unread" badge display
   */
  unreadCount: number;
}

/**
 * Chat History Response DTO
 * 
 * @description Paginated response with metadata for UI display
 */
export class ChatHistoryResponseDto {
  /**
   * Array of chat history items, sorted by last activity
   */
  chats: ChatHistoryItemDto[];

  /**
   * Total number of chats in user's history
   */
  total: number;

  /**
   * Number of archived chats
   */
  archivedCount: number;

  /**
   * Number of active (non-archived) chats
   */
  activeCount: number;
}

/**
 * Archive Chat Response DTO
 * 
 * @description Response for archive/unarchive operations
 */
export class ArchiveChatResponseDto {
  /**
   * Room ID that was modified
   */
  roomId: string;

  /**
   * Current archive status after the operation
   */
  isArchived: boolean;

  /**
   * ISO timestamp when the operation was performed
   */
  updatedAt: string;
}

/**
 * Delete Chat Response DTO
 * 
 * @description Response for delete from history operations
 */
export class DeleteChatResponseDto {
  /**
   * Room ID that was removed from history
   */
  roomId: string;

  /**
   * Confirmation that deletion was successful
   */
  deleted: boolean;

  /**
   * ISO timestamp when the deletion occurred
   */
  deletedAt: string;
}
