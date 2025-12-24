/**
 * @fileoverview Session Service
 * @description Manages anonymous user sessions and presence
 * @module modules/session/services/session
 */

import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { UserSession, UserSessionDocument } from '../schemas/session.schema';
import { generateId } from '../../../common/utils/uuid.util';

/**
 * Cache keys for session data
 */
const CACHE_KEYS = {
  SESSION: (sessionId: string) => `session:${sessionId}`,
  USER_ID: (sessionId: string) => `session:${sessionId}:userId`,
  SOCKET: (socketId: string) => `socket:${socketId}`,
  ROOM_PRESENCE: (roomId: string) => `room:${roomId}:presence`,
};

/**
 * Session Service
 * 
 * @description Manages user sessions with the following features:
 * - Session creation and retrieval
 * - User ID generation and mapping
 * - Socket connection tracking
 * - Presence management for rooms
 * - Chat history tracking
 * 
 * @class SessionService
 */
@Injectable()
export class SessionService implements OnModuleInit {
  private readonly logger = new Logger(SessionService.name);
  
  // Cache TTL values loaded from config
  private cacheTtl: { SESSION: number; PRESENCE: number };

  constructor(
    @InjectModel(UserSession.name)
    private readonly sessionModel: Model<UserSessionDocument>,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.cacheTtl = {
      SESSION: this.configService.get<number>('CACHE_TTL_SESSION', 86400),
      PRESENCE: this.configService.get<number>('CACHE_TTL_PRESENCE', 60),
    };
  }

  /**
   * Gets or creates a session for the given session ID
   * 
   * @description If a session exists, returns it. Otherwise, creates a new one.
   * Also ensures a user ID is mapped to the session.
   * 
   * @param {string} sessionId - Client-provided session ID
   * @returns {Promise<{ session: UserSessionDocument; userId: string }>} Session and user ID
   * 
   * @example
   * const { session, userId } = await sessionService.getOrCreateSession('client-session-id');
   */
  async getOrCreateSession(
    sessionId: string,
  ): Promise<{ session: UserSessionDocument; userId: string }> {
    // Try to get existing session
    let session = await this.sessionModel.findOne({ sessionId }).exec();

    if (!session) {
      // Create new session
      this.logger.log(`Creating new session: ${sessionId}`);
      session = new this.sessionModel({
        sessionId,
      });
      await session.save();
    }

    // Get or create user ID
    const userId = await this.getOrCreateUserId(sessionId);

    return { session, userId };
  }

  /**
   * Gets or creates a user ID for a session
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<string>} User ID
   */
  async getOrCreateUserId(sessionId: string): Promise<string> {
    const cacheKey = CACHE_KEYS.USER_ID(sessionId);
    
  // Try cache first, but handle Redis being unavailable
  try {
    if (this.redisClient.status === 'ready') {
      const userId = await this.redisClient.get(cacheKey);
      if (userId) return userId;
    }
  } catch (error) {
    this.logger.warn(`Redis unavailable for getOrCreateUserId: ${error.message}`);
  }

  // Check database for existing session with userId
  const session = await this.sessionModel.findOne({ sessionId }).exec();
  if (session?.userId) {
    // Cache it if Redis is available
    this.cacheUserIdSafe(cacheKey, session.userId);
    return session.userId;
  }

  // Generate new user ID
  const userId = generateId();
  
  // Update database
  await this.sessionModel.findOneAndUpdate(
    { sessionId },
    { userId },
    { upsert: true },
  ).exec();

  // Cache it if Redis is available
  this.cacheUserIdSafe(cacheKey, userId);
  this.logger.debug(`Created new userId ${userId} for session ${sessionId}`);

  return userId;
}

/**
 * Safely cache a user ID (doesn't fail if Redis is unavailable)
 */
private async cacheUserIdSafe(cacheKey: string, userId: string): Promise<void> {
  try {
    if (this.redisClient.status === 'ready') {
      await this.redisClient.setex(cacheKey, this.cacheTtl.SESSION, userId);
    }
  } catch (error) {
    this.logger.warn(`Failed to cache userId: ${error.message}`);
  }
}

/**
 * Gets user ID for a session (returns null if not found)
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<string | null>} User ID or null
 */
async getUserId(sessionId: string): Promise<string | null> {
  try {
    if (this.redisClient.status === 'ready') {
      const cached = await this.redisClient.get(CACHE_KEYS.USER_ID(sessionId));
      if (cached) return cached;
    }
  } catch (error) {
    this.logger.warn(`Redis unavailable for getUserId: ${error.message}`);
  }

  // Fallback to database
  const session = await this.sessionModel.findOne({ sessionId }).exec();
  return session?.userId || null;
}

/**
 * Updates socket connection for a session
 * 
 * @param {string} sessionId - Session ID
 * @param {string} socketId - WebSocket connection ID
 * @returns {Promise<void>}
 */
async connectSocket(sessionId: string, socketId: string): Promise<void> {
  this.logger.debug(`Connecting socket ${socketId} for session ${sessionId}`);

  // Update session
  await this.sessionModel.findOneAndUpdate(
    { sessionId },
    {
      socketId,
      isOnline: true,
      lastSeen: new Date(),
    },
    { upsert: true },
  );

  // Cache socket mapping (if Redis is available)
  try {
    if (this.redisClient.status === 'ready') {
      await this.redisClient.setex(
        CACHE_KEYS.SOCKET(socketId),
        this.cacheTtl.SESSION,
        sessionId,
      );
    }
  } catch (error) {
    this.logger.warn(`Failed to cache socket mapping: ${error.message}`);
  }
}

/**
 * Handles socket disconnection
 * 
 * @param {string} socketId - Disconnected socket ID
 * @returns {Promise<string | null>} Session ID if found
 */
async disconnectSocket(socketId: string): Promise<string | null> {
  this.logger.debug(`Disconnecting socket: ${socketId}`);

  let sessionId: string | null = null;

  // Try to get session ID from Redis cache
  try {
    if (this.redisClient.status === 'ready') {
      sessionId = await this.redisClient.get(CACHE_KEYS.SOCKET(socketId));
    }
  } catch (error) {
    this.logger.warn(`Redis unavailable for disconnectSocket: ${error.message}`);
  }

  // Fallback: find session by socketId in database
  if (!sessionId) {
    const session = await this.sessionModel.findOne({ socketId }).exec();
    sessionId = session?.sessionId || null;
  }

  if (sessionId) {
    // Update session
    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      {
        socketId: null,
        isOnline: false,
        lastSeen: new Date(),
      },
    );

    // Remove socket mapping from cache
    try {
      if (this.redisClient.status === 'ready') {
        await this.redisClient.del(CACHE_KEYS.SOCKET(socketId));
      }
    } catch (error) {
      this.logger.warn(`Failed to remove socket mapping: ${error.message}`);
    }
  }

  return sessionId;
}

  /**
   * Updates current room for a session
   * 
   * @param {string} sessionId - Session ID
   * @param {string | null} roomId - Room ID or null if leaving all rooms
   * @returns {Promise<void>}
   */
  async setCurrentRoom(sessionId: string, roomId: string | null): Promise<void> {
    this.logger.debug(`Setting current room for ${sessionId}: ${roomId}`);

    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      { currentRoomId: roomId },
    );

    // Update presence if joining a room
    if (roomId) {
      await this.setPresence(roomId, sessionId, true);
    }
  }

  /**
   * Gets session ID from socket ID
   * 
   * @param {string} socketId - Socket ID
   * @returns {Promise<string | null>} Session ID or null
   */
  async getSessionBySocket(socketId: string): Promise<string | null> {
  try {
    if (this.redisClient.status === 'ready') {
      const cached = await this.redisClient.get(CACHE_KEYS.SOCKET(socketId));
      if (cached) return cached;
    }
  } catch (error) {
    this.logger.warn(`Redis unavailable for getSessionBySocket: ${error.message}`);
  }

  // Fallback to database
  const session = await this.sessionModel.findOne({ socketId }).exec();
  return session?.sessionId || null;
}

/**
 * Sets presence status for a user in a room
 * 
 * @param {string} roomId - Room ID
 * @param {string} sessionId - Session ID
 * @param {boolean} isPresent - Presence status
 * @returns {Promise<void>}
 */
async setPresence(
  roomId: string,
  sessionId: string,
  isPresent: boolean,
): Promise<void> {
  try {
    if (this.redisClient.status !== 'ready') {
      this.logger.debug('Redis unavailable, skipping presence update');
      return;
    }

    const key = CACHE_KEYS.ROOM_PRESENCE(roomId);

    if (isPresent) {
      await this.redisClient.sadd(key, sessionId);
      await this.redisClient.expire(key, this.cacheTtl.PRESENCE);
    } else {
      await this.redisClient.srem(key, sessionId);
    }
  } catch (error) {
    this.logger.warn(`Failed to update presence: ${error.message}`);
  }
}

/**
 * Gets all present users in a room
 * 
 * @param {string} roomId - Room ID
 * @returns {Promise<string[]>} Array of session IDs
 */
async getRoomPresence(roomId: string): Promise<string[]> {
  try {
    if (this.redisClient.status === 'ready') {
      return this.redisClient.smembers(CACHE_KEYS.ROOM_PRESENCE(roomId));
    }
  } catch (error) {
    this.logger.warn(`Redis unavailable for getRoomPresence: ${error.message}`);
  }

  // Fallback: query database for online sessions in this room
  const sessions = await this.sessionModel
    .find({ currentRoomId: roomId, isOnline: true })
    .select('sessionId')
    .exec();
  
  return sessions.map((s) => s.sessionId);
}

/**
 * Adds a room to user's chat history
 * 
 * @param {string} sessionId - Session ID
 * @param {string} roomId - Room ID to add
 * @returns {Promise<void>}
 */
async addToHistory(sessionId: string, roomId: string): Promise<void> {
  await this.sessionModel.findOneAndUpdate(
    { sessionId },
    { $addToSet: { chatHistory: roomId } },
  );
}

/**
 * Archives a chat for a user
 * 
 * @param {string} sessionId - Session ID
 * @param {string} roomId - Room ID to archive
 * @returns {Promise<void>}
 */
async archiveChat(sessionId: string, roomId: string): Promise<void> {
  await this.sessionModel.findOneAndUpdate(
    { sessionId },
    { $addToSet: { archivedChats: roomId } },
  );
}

/**
 * Removes a chat from archives
   * 
   * @param {string} sessionId - Session ID
   * @param {string} roomId - Room ID to unarchive
   * @returns {Promise<void>}
   */
  async unarchiveChat(sessionId: string, roomId: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      { $pull: { archivedChats: roomId } },
    );
  }

  /**
   * Removes a chat from user's history
   * 
   * @param {string} sessionId - Session ID
   * @param {string} roomId - Room ID to remove
   * @returns {Promise<void>}
   */
  async removeFromHistory(sessionId: string, roomId: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      {
        $pull: {
          chatHistory: roomId,
          archivedChats: roomId,
        },
      },
    );
  }

  /**
   * Gets a session by session ID
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<UserSessionDocument | null>} Session or null
   */
  async getSession(sessionId: string): Promise<UserSessionDocument | null> {
    return this.sessionModel.findOne({ sessionId }).exec();
  }

  /**
   * Updates last seen timestamp
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async updateLastSeen(sessionId: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      { lastSeen: new Date() },
    );
  }
}
