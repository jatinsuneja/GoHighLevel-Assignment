/**
 * @fileoverview Room Service
 * @description Business logic layer for room operations
 * @module modules/room/services/room
 * 
 * Design Pattern: Service Layer Pattern
 * - Contains all business logic for room operations
 * - Orchestrates between repository, cache, and event systems
 * - Throws domain-specific exceptions for error handling
 * - Decoupled from data access and presentation layers
 */

import { Injectable, Inject, Logger, forwardRef, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { RoomRepository } from '../repositories/room.repository';
import { SessionService } from '../../session/services/session.service';
import { RoomDocument, RoomStatus, Participant } from '../schemas/room.schema';
import { CreateRoomDto, JoinRoomDto } from '../dto/room.dto';
import { generateId } from '../../../common/utils/uuid.util';
import {
  RoomNotFoundException,
  RoomFullException,
  RoomClosedException,
  UserNotInRoomException,
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
export class RoomService implements OnModuleInit {
  private readonly logger = new Logger(RoomService.name);
  
  // Cache TTL values loaded from config
  private cacheTtl: { ROOM: number; USER_ROOMS: number; SESSION: number };
  // Default room values from config
  private defaultMaxParticipants: number;
  private defaultRoomExpiryHours: number;

  constructor(
    private readonly roomRepository: RoomRepository,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.cacheTtl = {
      ROOM: this.configService.get<number>('CACHE_TTL_ROOM', 3600),
      USER_ROOMS: this.configService.get<number>('CACHE_TTL_USER_ROOMS', 1800),
      SESSION: this.configService.get<number>('CACHE_TTL_SESSION', 86400),
    };
    this.defaultMaxParticipants = this.configService.get<number>('DEFAULT_MAX_PARTICIPANTS', 10);
    this.defaultRoomExpiryHours = this.configService.get<number>('DEFAULT_ROOM_EXPIRY_HOURS', 24);
  }

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
  async createRoom(sessionId: string, dto: CreateRoomDto): Promise<RoomDocument> {
    this.logger.log(`Creating room for session: ${sessionId}`);

    // Generate user ID from session
    const userId = await this.getOrCreateUserId(sessionId);

    // Create room in database with optional parameters
    const room = await this.roomRepository.create(
      userId,
      dto.displayName,
      dto.maxParticipants || this.defaultMaxParticipants,
      dto.expiresInHours || this.defaultRoomExpiryHours,
    );

    // Cache room for quick lookup
    await this.cacheRoom(room);

    // Add room to user's chat history
    await this.sessionService.addToHistory(sessionId, room._id.toString());

    this.logger.log(`Room created successfully: ${room.roomCode}`);
    return room;
  }

  /**
   * Joins an existing room by room code
   * 
   * @description Validates and adds a participant to a room:
   * - Checks if room exists and is active
   * - Validates room is not full (max 2 participants)
   * - Prevents duplicate joins
   * - Updates cache after join
   * 
   * @param {string} sessionId - Joiner's session ID
   * @param {JoinRoomDto} dto - Join room data
   * @returns {Promise<RoomDocument>} Updated room with new participant
   * @throws {RoomNotFoundException} If room doesn't exist
   * @throws {RoomClosedException} If room is closed
   * @throws {RoomFullException} If room already has 2 participants
   * 
   * @example
   * const room = await roomService.joinRoom('session-uuid', {
   *   roomCode: 'ABC123',
   *   displayName: 'Anonymous User 2'
   * });
   */
  async joinRoom(sessionId: string, dto: JoinRoomDto): Promise<RoomDocument> {
    this.logger.log(`Joining room ${dto.roomCode} for session: ${sessionId}`);

    // Try cache first, then database
    let room = await this.getRoomFromCache(dto.roomCode);
    this.logger.debug(`Cache lookup for ${dto.roomCode}: ${room ? 'found' : 'not found'}`);
    
    if (!room) {
      room = await this.roomRepository.findByRoomCode(dto.roomCode);
      this.logger.debug(`DB lookup for ${dto.roomCode}: ${room ? `found (${room._id})` : 'not found'}`);
    }

    // Validate room exists
    if (!room) {
      throw new RoomNotFoundException(dto.roomCode);
    }

    // Validate room is active
    if (room.status === RoomStatus.CLOSED) {
      throw new RoomClosedException(dto.roomCode);
    }

    // Get or create user ID
    const userId = await this.getOrCreateUserId(sessionId);

    // Check if user is already a participant
    const existingParticipant = room.participants.find(
      (p) => p.userId === userId,
    );

    if (existingParticipant) {
      // User is rejoining - reactivate if inactive
      if (!existingParticipant.isActive) {
        room = await this.roomRepository.updateParticipantStatus(
          room._id,
          userId,
          true,
        );
        await this.cacheRoom(room!);
      }
      // Ensure room is in user's history (re-add if previously deleted)
      await this.sessionService.addToHistory(sessionId, room!._id.toString());
      return room!;
    }

    // Validate room is not full
    if (room.participants.length >= 2) {
      throw new RoomFullException(dto.roomCode);
    }

    // Create new participant
    const participant: Participant = {
      userId,
      displayName: dto.displayName,
      joinedAt: new Date(),
      isActive: true,
      leftAt: null,
    };

    // Add participant to room
    const updatedRoom = await this.roomRepository.addParticipant(
      room._id,
      participant,
    );

    if (!updatedRoom) {
      throw new RoomNotFoundException(dto.roomCode);
    }

    // Update cache
    await this.cacheRoom(updatedRoom);

    // Add room to user's chat history
    await this.sessionService.addToHistory(sessionId, updatedRoom._id.toString());

    this.logger.log(`User ${userId} joined room ${dto.roomCode}`);
    return updatedRoom;
  }

  /**
   * Leaves a room
   * 
   * @description Marks a participant as inactive:
   * - Updates participant status
   * - Checks if room should be closed (both left)
   * - Invalidates cache
   * 
   * @param {string} sessionId - User's session ID
   * @param {string} roomId - Room to leave
   * @returns {Promise<RoomDocument>} Updated room
   * @throws {RoomNotFoundException} If room doesn't exist
   * @throws {UserNotInRoomException} If user is not in the room
   */
  async leaveRoom(sessionId: string, roomId: string): Promise<RoomDocument> {
    this.logger.log(`Leaving room ${roomId} for session: ${sessionId}`);

    // Get user ID
    const userId = await this.getOrCreateUserId(sessionId);

    // Find room
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    // Verify user is a participant
    const participant = room.participants.find((p) => p.userId === userId);

    if (!participant) {
      throw new UserNotInRoomException(userId, roomId);
    }

    // Update participant status
    let updatedRoom = await this.roomRepository.updateParticipantStatus(
      roomId,
      userId,
      false,
    );

    if (!updatedRoom) {
      throw new RoomNotFoundException(roomId);
    }

    // Check if room should be closed (both participants left)
    const activeCount = updatedRoom.participants.filter((p) => p.isActive).length;
    
    if (activeCount === 0 && updatedRoom.participants.length === 2) {
      this.logger.log(`Both participants left, closing room: ${roomId}`);
      updatedRoom = await this.roomRepository.closeRoom(roomId);
      
      // Invalidate cache
      await this.invalidateRoomCache(updatedRoom!);
    } else {
      // Update cache
      await this.cacheRoom(updatedRoom);
    }

    return updatedRoom!;
  }

  /**
   * Gets a room by ID
   * 
   * @param {string} roomId - Room UUID
   * @returns {Promise<RoomDocument>} Room document
   * @throws {RoomNotFoundException} If room doesn't exist
   */
  async getRoomById(roomId: string): Promise<RoomDocument> {
    // Try cache first (by room code if available)
    const cacheKey = `room:id:${roomId}`;
    const cachedRoomCode = await this.redisClient.get(cacheKey);
    
    if (cachedRoomCode) {
      const cachedRoom = await this.getRoomFromCache(cachedRoomCode);
      if (cachedRoom) {
        return cachedRoom;
      }
    }

    // Fallback to database
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    // Cache the room ID → room code mapping for future lookups
    await this.redisClient.setex(cacheKey, this.cacheTtl.ROOM, room.roomCode);
    await this.cacheRoom(room);

    return room;
  }

  /**
   * Gets a room by room code
   * 
   * @param {string} roomCode - 6-character room code
   * @returns {Promise<RoomDocument>} Room document
   * @throws {RoomNotFoundException} If room doesn't exist
   */
  async getRoomByCode(roomCode: string): Promise<RoomDocument> {
    // Try cache first
    let room = await this.getRoomFromCache(roomCode);

    if (!room) {
      room = await this.roomRepository.findByRoomCode(roomCode);
    }

    if (!room) {
      throw new RoomNotFoundException(roomCode);
    }

    return room;
  }

  /**
   * Closes a room manually
   * 
   * @description Allows a participant to close/end a chat room.
   * Only participants of the room can close it.
   * 
   * @param {string} sessionId - User's session ID
   * @param {string} roomId - Room to close
   * @returns {Promise<RoomDocument>} Closed room
   * @throws {RoomNotFoundException} If room doesn't exist
   * @throws {UnauthorizedActionException} If user is not a participant
   */
  async closeRoom(sessionId: string, roomId: string): Promise<RoomDocument> {
    this.logger.log(`Closing room ${roomId} for session: ${sessionId}`);

    const userId = await this.getOrCreateUserId(sessionId);
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    // Check if user is a participant
    const isParticipant = room.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new RoomNotFoundException(roomId); // Don't reveal room exists to non-participants
    }

    // Close the room
    const closedRoom = await this.roomRepository.closeRoom(roomId);

    if (!closedRoom) {
      throw new RoomNotFoundException(roomId);
    }

    // Invalidate cache
    await this.invalidateRoomCache(closedRoom);

    this.logger.log(`Room ${roomId} closed by user ${userId}`);
    return closedRoom;
  }

  /**
   * Gets all rooms for a user
   * 
   * @param {string} sessionId - User's session ID
   * @returns {Promise<RoomDocument[]>} Array of user's rooms
   */
  async getUserRooms(sessionId: string): Promise<RoomDocument[]> {
    const userId = await this.getOrCreateUserId(sessionId);
    return this.roomRepository.findUserRooms(userId);
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
    const cachedUserId = await this.redisClient.get(`session:${sessionId}:userId`);

    if (cachedUserId) {
      return cachedUserId;
    }

    // Generate new user ID and associate with session
    const userId = generateId();
    await this.redisClient.setex(
      `session:${sessionId}:userId`,
      this.cacheTtl.SESSION,
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
        this.cacheTtl.ROOM,
        roomData,
      ),
      this.redisClient.setex(
        CACHE_KEYS.ROOM_BY_ID(room._id),
        this.cacheTtl.ROOM,
        roomData,
      ),
    ]);
  }

  /**
   * Gets a room from cache by room code
   * 
   * @private
   * @param {string} roomCode - Room code
   * @returns {Promise<RoomDocument | null>} Cached room or null
   */
  private async getRoomFromCache(roomCode: string): Promise<RoomDocument | null> {
    const cached = await this.redisClient.get(CACHE_KEYS.ROOM_BY_CODE(roomCode));

    if (cached) {
      const parsed = JSON.parse(cached);
      // When Mongoose serializes to JSON, _id becomes id
      // Map it back for consistency
      if (parsed.id && !parsed._id) {
        parsed._id = parsed.id;
      }
      return parsed as RoomDocument;
    }

    return null;
  }

  /**
   * Invalidates room cache entries
   * 
   * @private
   * @param {RoomDocument} room - Room to invalidate
   */
  private async invalidateRoomCache(room: RoomDocument): Promise<void> {
    await Promise.all([
      this.redisClient.del(CACHE_KEYS.ROOM_BY_CODE(room.roomCode)),
      this.redisClient.del(CACHE_KEYS.ROOM_BY_ID(room._id)),
    ]);
  }
}
