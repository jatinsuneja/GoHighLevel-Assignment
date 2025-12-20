/**
 * @fileoverview Room Controller
 * @description REST API endpoints for room operations
 * @module modules/room/controllers/room
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RoomService } from '../services/room.service';
import { CreateRoomDto, CreateRoomResponseDto } from '../dto/room.dto';
import { RoomDocument } from '../schemas/room.schema';
import { SessionNotFoundException } from '../../../common/exceptions/business.exceptions';

/**
 * Room Controller
 *
 * @description Exposes REST API endpoints for room management:
 * - POST /rooms/create - Create a new room
 * - POST /rooms/join - Join an existing room
 * - POST /rooms/:roomId/leave - Leave a room
 * - GET /rooms/:roomId - Get room details
 * - GET /rooms/code/:roomCode - Get room by code
 *
 * @class RoomController
 */
@Controller('rooms')
export class RoomController {
  private readonly logger = new Logger(RoomController.name);

  constructor(private readonly roomService: RoomService) {}

  /**
   * Creates a new chat room
   *
   * @route POST /rooms/create
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {CreateRoomDto} dto - Room creation data
   * @returns {Promise<CreateRoomResponseDto>} Created room details with room code
   *
   * @example
   * // Request
   * POST /api/v1/rooms/create
   * Headers: { "X-Session-Id": "session-uuid" }
   * Body: { "displayName": "Anonymous User" }
   *
   * // Response 201
   * {
   *   "roomId": "019123ab-cdef-7000-8000-000000000001",
   *   "roomCode": "ABC123",
   *   "createdAt": "2025-12-18T10:00:00.000Z",
   *   "expiresAt": null
   * }
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createRoom(
    @Headers('x-session-id') sessionId: string,
    @Body() dto: CreateRoomDto,
  ): Promise<CreateRoomResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Creating room for session: ${sessionId.slice(0, 8)}...`);

    const room = await this.roomService.createRoom(sessionId, dto);

    return this.mapToCreateResponse(room);
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

  /**
   * Maps a room document to create response DTO
   *
   * @private
   * @param {RoomDocument} room - Room document
   * @returns {CreateRoomResponseDto} Mapped response
   */
  private mapToCreateResponse(room: RoomDocument): CreateRoomResponseDto {
    return {
      roomId: room._id,
      roomCode: room.roomCode,
      createdAt: room.createdAt,
      expiresAt: null, // Rooms don't expire in current implementation
    };
  }
}
