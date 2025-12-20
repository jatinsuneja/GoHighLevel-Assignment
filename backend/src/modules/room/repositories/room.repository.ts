/**
 * @fileoverview Room Repository
 * @description Data access layer for room operations using Repository Pattern
 * @module modules/room/repositories/room
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument, Participant } from '../schemas/room.schema';

/**
 * Room Repository Interface
 *
 * @description Defines the contract for room data access operations
 */
export interface IRoomRepository {
  create(creatorId: string, displayName: string): Promise<RoomDocument>;
  findById(roomId: string): Promise<RoomDocument | null>;
  addParticipant(
    roomId: string,
    participant: Participant,
  ): Promise<RoomDocument | null>;
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
    this.logger.log(
      `Room created: ${savedRoom._id} with code: ${savedRoom.roomCode}`,
    );

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
    this.logger.debug(
      `Adding participant ${participant.userId} to room ${roomId}`,
    );

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
   * Saves a room document (for complex updates)
   *
   * @param {RoomDocument} room - Room document to save
   * @returns {Promise<RoomDocument>} Saved room
   */
  async save(room: RoomDocument): Promise<RoomDocument> {
    return room.save();
  }
}
