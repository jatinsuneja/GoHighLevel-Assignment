/**
 * @fileoverview Room Repository
 * @description Data access layer for room operations using Repository Pattern
 * @module modules/room/repositories/room
 * 
 * Design Pattern: Repository Pattern
 * - Encapsulates data access logic
 * - Provides a clean API for data operations
 * - Separates business logic from data persistence
 * - Makes testing easier with mockable repository
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument, RoomStatus, Participant } from '../schemas/room.schema';

/**
 * Room Repository Interface
 * 
 * @description Defines the contract for room data access operations
 */
export interface IRoomRepository {
  create(creatorId: string, displayName: string): Promise<RoomDocument>;
  findById(roomId: string): Promise<RoomDocument | null>;
  findByRoomCode(roomCode: string): Promise<RoomDocument | null>;
  findActiveByRoomCode(roomCode: string): Promise<RoomDocument | null>;
  findUserRooms(userId: string): Promise<RoomDocument[]>;
  addParticipant(roomId: string, participant: Participant): Promise<RoomDocument | null>;
  updateParticipantStatus(roomId: string, userId: string, isActive: boolean): Promise<RoomDocument | null>;
  closeRoom(roomId: string): Promise<RoomDocument | null>;
  save(room: RoomDocument): Promise<RoomDocument>;
}

/**
 * Room Repository Implementation
 * 
 * @description Implements data access operations for rooms using Mongoose.
 * All database operations are encapsulated here for:
 * - Consistent query patterns
 * - Optimized database access
 * - Centralized error handling
 * 
 * @class RoomRepository
 * @implements {IRoomRepository}
 */
@Injectable()
export class RoomRepository implements IRoomRepository {
  private readonly logger = new Logger(RoomRepository.name);

  constructor(
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
  ) {}

  /**
   * Creates a new room with the initial participant
   * 
   * @param {string} creatorId - UUID of the room creator
   * @param {string} displayName - Display name of the creator
   * @param {number} maxParticipants - Maximum number of participants (optional, default 10)
   * @param {number} expiresInHours - Hours until room expires (optional, default 24)
   * @returns {Promise<RoomDocument>} The created room document
   * 
   * @example
   * const room = await roomRepository.create('user-uuid', 'Anonymous User', 10, 24);
   */
  async create(
    creatorId: string,
    displayName: string,
    maxParticipants: number = 10,
    expiresInHours: number = 24,
  ): Promise<RoomDocument> {
    this.logger.debug(`Creating room for user: ${creatorId}`);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const room = new this.roomModel({
      maxParticipants,
      expiresAt,
      participants: [
        {
          userId: creatorId,
          displayName,
          joinedAt: new Date(),
          isActive: true,
          leftAt: null,
        },
      ],
    });

    const savedRoom = await room.save();
    this.logger.log(`Room created: ${savedRoom._id} with code: ${savedRoom.roomCode}`);
    
    return savedRoom;
  }

  /**
   * Finds a room by its UUID
   * 
   * @param {string} roomId - Room UUID
   * @returns {Promise<RoomDocument | null>} Room document or null if not found
   */
  async findById(roomId: string): Promise<RoomDocument | null> {
    return this.roomModel.findById(roomId).exec();
  }

  /**
   * Finds a room by its room code (regardless of status)
   * 
   * @param {string} roomCode - 6-character room code
   * @returns {Promise<RoomDocument | null>} Room document or null if not found
   */
  async findByRoomCode(roomCode: string): Promise<RoomDocument | null> {
    const upperCode = roomCode.toUpperCase();
    this.logger.debug(`Looking up room by code: ${upperCode}`);
    const room = await this.roomModel
      .findOne({ roomCode: upperCode })
      .exec();
    this.logger.debug(`Room lookup result: ${room ? room._id : 'not found'}`);
    return room;
  }

  /**
   * Finds an active room by its room code
   * 
   * @param {string} roomCode - 6-character room code
   * @returns {Promise<RoomDocument | null>} Active room or null
   */
  async findActiveByRoomCode(roomCode: string): Promise<RoomDocument | null> {
    return this.roomModel
      .findOne({
        roomCode: roomCode.toUpperCase(),
        status: RoomStatus.ACTIVE,
      })
      .exec();
  }

  /**
   * Finds all rooms a user is participating in
   * 
   * @param {string} userId - User UUID
   * @returns {Promise<RoomDocument[]>} Array of rooms
   */
  async findUserRooms(userId: string): Promise<RoomDocument[]> {
    return this.roomModel
      .find({
        'participants.userId': userId,
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  /**
   * Finds active rooms for a user
   * 
   * @param {string} userId - User UUID
   * @returns {Promise<RoomDocument[]>} Array of active rooms
   */
  async findActiveUserRooms(userId: string): Promise<RoomDocument[]> {
    return this.roomModel
      .find({
        'participants.userId': userId,
        status: RoomStatus.ACTIVE,
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  /**
   * Adds a participant to a room
   * 
   * @param {string} roomId - Room UUID
   * @param {Participant} participant - Participant to add
   * @returns {Promise<RoomDocument | null>} Updated room or null
   */
  async addParticipant(
    roomId: string,
    participant: Participant,
  ): Promise<RoomDocument | null> {
    this.logger.debug(`Adding participant ${participant.userId} to room ${roomId}`);

    return this.roomModel
      .findByIdAndUpdate(
        roomId,
        {
          $push: { participants: participant },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Updates a participant's active status
   * 
   * @param {string} roomId - Room UUID
   * @param {string} userId - User UUID
   * @param {boolean} isActive - New active status
   * @returns {Promise<RoomDocument | null>} Updated room or null
   */
  async updateParticipantStatus(
    roomId: string,
    userId: string,
    isActive: boolean,
  ): Promise<RoomDocument | null> {
    this.logger.debug(`Updating participant ${userId} status to ${isActive} in room ${roomId}`);

    const updateData: Record<string, unknown> = {
      'participants.$.isActive': isActive,
    };

    if (!isActive) {
      updateData['participants.$.leftAt'] = new Date();
    }

    return this.roomModel
      .findOneAndUpdate(
        {
          _id: roomId,
          'participants.userId': userId,
        },
        { $set: updateData },
        { new: true },
      )
      .exec();
  }

  /**
   * Closes a room and marks it as inactive
   * 
   * @param {string} roomId - Room UUID
   * @returns {Promise<RoomDocument | null>} Closed room or null
   */
  async closeRoom(roomId: string): Promise<RoomDocument | null> {
    this.logger.log(`Closing room: ${roomId}`);

    return this.roomModel
      .findByIdAndUpdate(
        roomId,
        {
          status: RoomStatus.CLOSED,
          closedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Saves a room document (for complex updates)
   * 
   * @param {RoomDocument} room - Room document to save
   * @returns {Promise<RoomDocument>} Saved room
   */
  async save(room: RoomDocument): Promise<RoomDocument> {
    return room.save();
  }

  /**
   * Checks if a room code is already in use
   * 
   * @param {string} roomCode - Room code to check
   * @returns {Promise<boolean>} True if code exists
   */
  async roomCodeExists(roomCode: string): Promise<boolean> {
    const count = await this.roomModel
      .countDocuments({ roomCode: roomCode.toUpperCase() })
      .exec();
    return count > 0;
  }

  /**
   * Gets the count of active rooms
   * 
   * @returns {Promise<number>} Count of active rooms
   */
  async countActiveRooms(): Promise<number> {
    return this.roomModel
      .countDocuments({ status: RoomStatus.ACTIVE })
      .exec();
  }
}
