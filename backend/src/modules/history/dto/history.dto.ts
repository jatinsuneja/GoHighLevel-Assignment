/**
 * @fileoverview History DTOs (Data Transfer Objects)
 * @description Request and response DTOs for history operations
 * @module modules/history/dto
 */

import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Get History Query DTO
 * 
 * @description Query parameters for history retrieval
 */
export class GetHistoryQueryDto {
  /**
   * Include archived chats
   * @default false
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeArchived?: boolean = false;

  /**
   * Only show archived chats
   * @default false
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  archivedOnly?: boolean = false;
}

/**
 * Chat History Item Response DTO
 */
export class ChatHistoryItemDto {
  /**
   * Room ID
   */
  roomId: string;

  /**
   * Room code
   */
  roomCode: string;

  /**
   * Other participant's display name
   */
  otherParticipant: string | null;

  /**
   * Preview of the last message
   */
  lastMessage: string | null;

  /**
   * Timestamp of the last message
   */
  lastMessageAt: Date | null;

  /**
   * Room status
   */
  status: string;

  /**
   * Whether the chat is archived
   */
  isArchived: boolean;

  /**
   * Room creation date
   */
  createdAt: Date;
}

/**
 * Chat History Response DTO
 */
export class ChatHistoryResponseDto {
  /**
   * Array of chat history items
   */
  chats: ChatHistoryItemDto[];
}

/**
 * Archive Chat Response DTO
 */
export class ArchiveChatResponseDto {
  roomId: string;
  isArchived: boolean;
}

/**
 * Delete Chat Response DTO
 */
export class DeleteChatResponseDto {
  roomId: string;
  deleted: boolean;
}
