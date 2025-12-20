/**
 * @fileoverview Room DTOs (Data Transfer Objects)
 * @description Request and response DTOs for room operations
 * @module modules/room/dto
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
  @Length(1, 50, {
    message: 'Display name must be between 1 and 50 characters',
  })
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
  @Max(168, {
    message: 'Room cannot be active for more than 168 hours (7 days)',
  })
  expiresInHours?: number;
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
