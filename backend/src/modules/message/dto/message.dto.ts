/**
 * @fileoverview Message DTOs (Data Transfer Objects)
 * @description Request and response DTOs for message operations
 * @module modules/message/dto
 * 
 * Design Pattern: DTO Pattern
 * - Validates incoming request data using class-validator
 * - Transforms data with class-transformer
 * - Separates API contracts from internal domain models
 */

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ContentType, ReactionType } from '../schemas/message.schema';

/**
 * Send Message Request DTO
 * 
 * @description Validates the request to send a new message
 * 
 * @example
 * {
 *   "roomId": "019123ab-cdef-7000-8000-000000000001",
 *   "content": "Hello! 👋",
 *   "contentType": "text"
 * }
 */
export class SendMessageDto {
  /**
   * Room ID to send the message to
   */
  @IsString()
  @IsNotEmpty({ message: 'Room ID is required' })
  roomId: string;

  /**
   * Message content (text or emoji)
   * @example "Hello! 👋"
   */
  @IsString()
  @IsNotEmpty({ message: 'Message content is required' })
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  @Transform(({ value }) => value?.trim())
  content: string;

  /**
   * Type of content (text or emoji)
   * @default "text"
   */
  @IsOptional()
  @IsEnum(ContentType, { message: 'Content type must be "text" or "emoji"' })
  contentType?: ContentType = ContentType.TEXT;
}

/**
 * Get Messages Query DTO
 * 
 * @description Validates query parameters for message retrieval
 * 
 * @example
 * GET /messages?roomId=xxx&limit=50&before=cursor
 */
export class GetMessagesQueryDto {
  /**
   * Room ID to get messages from
   */
  @IsString()
  @IsNotEmpty({ message: 'Room ID is required' })
  roomId: string;

  /**
   * Maximum number of messages to return
   * @default 50
   */
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 50)
  limit?: number = 50;

  /**
   * Cursor for pagination (message ID to fetch before)
   */
  @IsOptional()
  @IsString()
  before?: string;

  /**
   * Cursor for pagination (message ID to fetch after)
   */
  @IsOptional()
  @IsString()
  after?: string;
}

/**
 * Add Reaction Request DTO
 * 
 * @description Validates the request to add a reaction
 * 
 * @example
 * {
 *   "type": "like"
 * }
 */
export class AddReactionDto {
  /**
   * Type of reaction to add
   */
  @IsEnum(ReactionType, {
    message: 'Reaction type must be "like", "love", or "laugh"',
  })
  type: ReactionType;
}

/**
 * Message Response DTO
 * 
 * @description Response structure for message operations
 */
export class MessageResponseDto {
  /**
   * Unique message identifier (UUID v7)
   */
  messageId: string;

  /**
   * Room ID the message belongs to
   */
  roomId: string;

  /**
   * Sender's user ID
   */
  senderId: string;

  /**
   * Sender's display name
   */
  senderName: string;

  /**
   * Message content (or deletion placeholder if deleted)
   */
  content: string;

  /**
   * Type of content
   */
  contentType: string;

  /**
   * Whether the message is deleted
   */
  isDeleted: boolean;

  /**
   * Deletion placeholder text (if deleted)
   */
  deletionPlaceholder?: string;

  /**
   * Reactions on this message
   */
  reactions: ReactionCountDto[];

  /**
   * Message creation timestamp
   */
  createdAt: Date;
}

/**
 * Reaction Count DTO
 * 
 * @description Reaction count with user reaction status
 */
export class ReactionCountDto {
  /**
   * Reaction type
   */
  type: ReactionType;

  /**
   * Total count of this reaction
   */
  count: number;

  /**
   * Whether the current user has added this reaction
   */
  userReacted: boolean;
}

/**
 * Paginated Messages Response DTO
 * 
 * @description Response with pagination info
 */
export class PaginatedMessagesResponseDto {
  /**
   * Array of messages
   */
  messages: MessageResponseDto[];

  /**
   * Pagination information
   */
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Delete Message Response DTO
 * 
 * @description Response for message deletion
 */
export class DeleteMessageResponseDto {
  messageId: string;
  isDeleted: boolean;
  deletedBy: string;
  placeholder: string;
}

/**
 * Reaction Response DTO
 * 
 * @description Response for reaction operations
 */
export class ReactionResponseDto {
  messageId: string;
  reactions: ReactionCountDto[];
}
