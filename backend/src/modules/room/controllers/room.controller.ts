/**
 * @fileoverview Room Controller
 * @description REST API endpoints for room operations
 * @module modules/room/controllers/room
 * 
 * Design Pattern: Controller Pattern
 * - Handles HTTP requests and responses
 * - Validates input using DTOs
 * - Delegates business logic to service layer
 * - Maps domain models to response DTOs
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
import {
  CreateRoomDto,
  JoinRoomDto,
  RoomResponseDto,
  CreateRoomResponseDto,
  ParticipantResponseDto,
} from '../dto/room.dto';
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
   * Joins an existing room by room code
   * 
   * @route POST /rooms/join
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {JoinRoomDto} dto - Join room data with room code
   * @returns {Promise<RoomResponseDto>} Room details with participants
   * 
   * @example
   * // Request
   * POST /api/v1/rooms/join
   * Headers: { "X-Session-Id": "session-uuid" }
   * Body: { "roomCode": "ABC123", "displayName": "Anonymous User 2" }
   * 
   * // Response 200
   * {
   *   "roomId": "019123ab-cdef-7000-8000-000000000001",
   *   "roomCode": "ABC123",
   *   "participants": [...],
   *   "status": "active"
   * }
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinRoom(
    @Headers('x-session-id') sessionId: string,
    @Body() dto: JoinRoomDto,
  ): Promise<RoomResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Joining room ${dto.roomCode} for session: ${sessionId.slice(0, 8)}...`);

    const room = await this.roomService.joinRoom(sessionId, dto);

    return this.mapToRoomResponse(room);
  }

  /**
   * Leaves a room
   * 
   * @route POST /rooms/:roomId/leave
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} roomId - Room UUID from URL parameter
   * @returns {Promise<RoomResponseDto>} Updated room details
   * 
   * @example
   * // Request
   * POST /api/v1/rooms/019123ab-cdef-7000-8000-000000000001/leave
   * Headers: { "X-Session-Id": "session-uuid" }
   * 
   * // Response 200
   * {
   *   "roomId": "019123ab-cdef-7000-8000-000000000001",
   *   "status": "closed",
   *   "message": "You have left the room"
   * }
   */
  @Post(':roomId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveRoom(
    @Headers('x-session-id') sessionId: string,
    @Param('roomId') roomId: string,
  ): Promise<RoomResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Leaving room ${roomId} for session: ${sessionId.slice(0, 8)}...`);

    const room = await this.roomService.leaveRoom(sessionId, roomId);

    return this.mapToRoomResponse(room);
  }

  /**
   * Closes a room permanently
   * 
   * @route POST /rooms/:roomId/close
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} roomId - Room UUID from URL parameter
   * @returns {Promise<RoomResponseDto>} Closed room details
   * 
   * @example
   * // Request
   * POST /api/v1/rooms/xxx/close
   * Headers: { "X-Session-Id": "session-uuid" }
   * 
   * // Response 200
   * {
   *   "roomId": "019123ab-cdef-7000-8000-000000000001",
   *   "status": "closed",
   *   "closedAt": "2025-12-23T10:00:00.000Z"
   * }
   */
  @Post(':roomId/close')
  @HttpCode(HttpStatus.OK)
  async closeRoom(
    @Headers('x-session-id') sessionId: string,
    @Param('roomId') roomId: string,
  ): Promise<RoomResponseDto> {
    this.validateSessionId(sessionId);

    this.logger.log(`Closing room ${roomId} for session: ${sessionId.slice(0, 8)}...`);

    const room = await this.roomService.closeRoom(sessionId, roomId);

    return this.mapToRoomResponse(room);
  }

  /**
   * Gets room details by ID
   * 
   * @route GET /rooms/:roomId
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} roomId - Room UUID from URL parameter
   * @returns {Promise<RoomResponseDto>} Room details
   */
  @Get(':roomId')
  async getRoomById(
    @Headers('x-session-id') sessionId: string,
    @Param('roomId') roomId: string,
  ): Promise<RoomResponseDto> {
    this.validateSessionId(sessionId);

    const room = await this.roomService.getRoomById(roomId);

    return this.mapToRoomResponse(room);
  }

  /**
   * Gets room details by room code
   * 
   * @route GET /rooms/code/:roomCode
   * @param {string} sessionId - Session ID from X-Session-Id header
   * @param {string} roomCode - 6-character room code
   * @returns {Promise<RoomResponseDto>} Room details
   */
  @Get('code/:roomCode')
  async getRoomByCode(
    @Headers('x-session-id') sessionId: string,
    @Param('roomCode') roomCode: string,
  ): Promise<RoomResponseDto> {
    this.validateSessionId(sessionId);

    const room = await this.roomService.getRoomByCode(roomCode.toUpperCase());

    return this.mapToRoomResponse(room);
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

  /**
   * Maps a room document to room response DTO
   * 
   * @private
   * @param {RoomDocument} room - Room document
   * @returns {RoomResponseDto} Mapped response
   */
  private mapToRoomResponse(room: RoomDocument): RoomResponseDto {
    return {
      roomId: room._id,
      roomCode: room.roomCode,
      participants: room.participants.map((p) => this.mapToParticipantResponse(p)),
      status: room.status,
      createdAt: room.createdAt,
      closedAt: room.closedAt || undefined,
    };
  }

  /**
   * Maps a participant to participant response DTO
   * 
   * @private
   * @param {any} participant - Participant subdocument
   * @returns {ParticipantResponseDto} Mapped response
   */
  private mapToParticipantResponse(participant: {
    userId: string;
    displayName: string;
    isActive: boolean;
    joinedAt: Date;
  }): ParticipantResponseDto {
    return {
      userId: participant.userId,
      displayName: participant.displayName,
      isActive: participant.isActive,
      joinedAt: participant.joinedAt,
    };
  }
}
