/**
 * @fileoverview Room DTOs (Data Transfer Objects)
 * @description Request and response DTOs for room operations
 * @module modules/room/dto
 * 
 * Design Pattern: DTO Pattern
 * - Validates incoming request data using class-validator
 * - Transforms data with class-transformer
 * - Separates API contracts from internal domain models
 */

import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Create Room Request DTO
 * 
 * @description Validates the request to create a new chat room
 * 
 * @example
 * {
 *   "displayName": "Anonymous User",
 *   "maxParticipants": 10,
 *   "expiresInHours": 24
 * }
 */
export class CreateRoomDto {
  /**
   * Display name for the room creator
   * @example "Anonymous User"
   */
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @Length(1, 50, { message: 'Display name must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  displayName: string;

  /**
   * Maximum number of participants allowed in the room
   * @example 10
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2, { message: 'Room must allow at least 2 participants' })
  @Max(100, { message: 'Room cannot have more than 100 participants' })
  maxParticipants?: number;

  /**
   * Number of hours until the room expires
   * @example 24
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Room must be active for at least 1 hour' })
  @Max(168, { message: 'Room cannot be active for more than 168 hours (7 days)' })
  expiresInHours?: number;
}

/**
 * Join Room Request DTO
 * 
 * @description Validates the request to join an existing room
 * 
 * @example
 * {
 *   "roomCode": "ABC123",
 *   "displayName": "Anonymous User 2"
 * }
 */
export class JoinRoomDto {
  /**
   * 6-character room code (uppercase alphanumeric)
   * @example "ABC123"
   */
  @IsString()
  @IsNotEmpty({ message: 'Room code is required' })
  @Length(6, 6, { message: 'Room code must be exactly 6 characters' })
  @Matches(/^[A-Z0-9]{6}$/, {
    message: 'Room code must be 6 uppercase alphanumeric characters',
  })
  @Transform(({ value }) => value?.toUpperCase().trim())
  roomCode: string;

  /**
   * Display name for the joining user
   * @example "Anonymous User 2"
   */
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @Length(1, 50, { message: 'Display name must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  displayName: string;
}

/**
 * Leave Room Request DTO
 * 
 * @description Validates the request to leave a room
 * No additional fields needed - room ID comes from URL params
 */
export class LeaveRoomDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Room Response DTO
 * 
 * @description Response structure for room operations
 */
export class RoomResponseDto {
  /**
   * Unique room identifier (UUID v7)
   */
  roomId: string;

  /**
   * 6-character shareable room code
   */
  roomCode: string;

  /**
   * Room participants with their details
   */
  participants: ParticipantResponseDto[];

  /**
   * Room status (active/closed)
   */
  status: string;

  /**
   * Room creation timestamp
   */
  createdAt: Date;

  /**
   * Room closure timestamp (if closed)
   */
  closedAt?: Date;
}

/**
 * Participant Response DTO
 * 
 * @description Response structure for room participants
 */
export class ParticipantResponseDto {
  /**
   * Participant's user ID
   */
  userId: string;

  /**
   * Participant's display name
   */
  displayName: string;

  /**
   * Whether the participant is currently active
   */
  isActive: boolean;

  /**
   * When the participant joined
   */
  joinedAt: Date;
}

/**
 * Create Room Response DTO
 * 
 * @description Response for successful room creation
 */
export class CreateRoomResponseDto {
  roomId: string;
  roomCode: string;
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * Room ID Parameter DTO
 * 
 * @description Validates room ID from URL parameters
 */
export class RoomIdParamDto {
  @IsString()
  @IsNotEmpty({ message: 'Room ID is required' })
  roomId: string;
}
