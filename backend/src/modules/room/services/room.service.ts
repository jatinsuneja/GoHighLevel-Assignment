/**
 * @fileoverview Room Service
 * @description Business logic layer for room operations
 * @module modules/room/services/room
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { RoomRepository } from '../repositories/room.repository';
import { RoomDocument, RoomStatus, Participant } from '../schemas/room.schema';
import { CreateRoomDto } from '../dto/room.dto';
import { generateId } from '../../../common/utils/uuid.util';
import {
  RoomNotFoundException,
} from '../../../common/exceptions/business.exceptions';

/**
 * Room Cache Keys
 *
 * @description Constants for Redis cache key patterns
 */
const CACHE_KEYS = {
  ROOM_BY_CODE: (code: string) => `room:code:${code}`,
  ROOM_BY_ID: (id: string) => `room:id:${id}`,
  USER_ROOMS: (userId: string) => `user:${userId}:rooms`,
};

/**
 * Cache TTL in seconds
 */
const CACHE_TTL = {
  ROOM: 3600, // 1 hour
  USER_ROOMS: 1800, // 30 minutes
};

/**
 * Room Service
 *
 * @description Handles all business logic for room operations:
 * - Room creation with unique room codes
 * - Joining rooms with participant validation
 * - Leaving rooms with auto-close logic
 * - Caching for performance optimization
 *
 * @class RoomService
 */
@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private readonly roomRepository: RoomRepository,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {}

  /**
   * Creates a new chat room
   *
   * @description Creates a room with:
   * - Unique UUID v7 identifier
   * - 6-character shareable room code
   * - Creator as the first participant
   * - Caches room for quick lookup
   *
   * @param {string} sessionId - Creator's session ID
   * @param {CreateRoomDto} dto - Room creation data
   * @returns {Promise<RoomDocument>} Created room
   *
   * @example
   * const room = await roomService.createRoom('session-uuid', {
   *   displayName: 'Anonymous User',
   *   maxParticipants: 10,
   *   expiresInHours: 24
   * });
   */
  async createRoom(
    sessionId: string,
    dto: CreateRoomDto,
  ): Promise<RoomDocument> {
    this.logger.log(`Creating room for session: ${sessionId}`);

    // Generate user ID from session
    const userId = await this.getOrCreateUserId(sessionId);

    // Create room in database with optional parameters
    const room = await this.roomRepository.create(
      userId,
      dto.displayName,
      dto.maxParticipants || 10,
      dto.expiresInHours || 24,
    );

    // Cache room for quick lookup
    await this.cacheRoom(room);

    this.logger.log(`Room created successfully: ${room.roomCode}`);
    return room;
  }

  /**
   * Gets or creates a user ID from session ID
   *
   * @private
   * @param {string} sessionId - Session identifier
   * @returns {Promise<string>} User ID
   */
  private async getOrCreateUserId(sessionId: string): Promise<string> {
    // Check if session has an associated user ID
    const cachedUserId = await this.redisClient.get(
      `session:${sessionId}:userId`,
    );

    if (cachedUserId) {
      return cachedUserId;
    }

    // Generate new user ID and associate with session
    const userId = generateId();
    await this.redisClient.setex(
      `session:${sessionId}:userId`,
      86400, // 24 hours
      userId,
    );

    return userId;
  }

  /**
   * Caches a room for quick lookup
   *
   * @private
   * @param {RoomDocument} room - Room to cache
   */
  private async cacheRoom(room: RoomDocument): Promise<void> {
    const roomData = JSON.stringify(room.toJSON());

    await Promise.all([
      this.redisClient.setex(
        CACHE_KEYS.ROOM_BY_CODE(room.roomCode),
        CACHE_TTL.ROOM,
        roomData,
      ),
      this.redisClient.setex(
        CACHE_KEYS.ROOM_BY_ID(room._id),
        CACHE_TTL.ROOM,
        roomData,
      ),
    ]);
  }

  /**
   * Gets a room by ID
   *
   * @param {string} roomId - Room UUID
   * @returns {Promise<RoomDocument>} Room document
   * @throws {RoomNotFoundException} If room doesn't exist
   */
  async getRoomById(roomId: string): Promise<RoomDocument> {
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    return room;
  }
}
