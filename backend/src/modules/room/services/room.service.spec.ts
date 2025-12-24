/**
 * @fileoverview Room Service Unit Tests
 * @description Comprehensive tests for RoomService business logic
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';
import { RoomRepository } from '../repositories/room.repository';
import { SessionService } from '../../session/services/session.service';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { RoomStatus } from '../schemas/room.schema';
import {
  RoomNotFoundException,
  RoomFullException,
  RoomClosedException,
  UserNotInRoomException,
} from '../../../common/exceptions/business.exceptions';

describe('RoomService', () => {
  let service: RoomService;
  let roomRepository: jest.Mocked<RoomRepository>;
  let sessionService: jest.Mocked<SessionService>;
  let redisClient: jest.Mocked<any>;

  const mockRoom = {
    _id: 'room-id-123',
    roomId: 'room-id-123',
    roomCode: 'ABC123',
    status: RoomStatus.ACTIVE,
    participants: [
      {
        userId: 'user-1',
        displayName: 'User One',
        joinedAt: new Date(),
        isActive: true,
        leftAt: null,
      },
    ],
    maxParticipants: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSessionId = 'session-123';
  const mockUserId = 'user-1';

  beforeEach(async () => {
    const mockRoomRepository = {
      create: jest.fn(),
      findByRoomCode: jest.fn(),
      findById: jest.fn(),
      addParticipant: jest.fn(),
      updateParticipantStatus: jest.fn(),
      updateStatus: jest.fn(),
      closeRoom: jest.fn(),
    };

    const mockSessionService = {
      getOrCreateUserId: jest.fn().mockResolvedValue(mockUserId),
      getUserDisplayName: jest.fn().mockResolvedValue('User One'),
      addToHistory: jest.fn().mockResolvedValue(undefined),
      getUserId: jest.fn().mockResolvedValue(mockUserId),
    };

    const mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: RoomRepository, useValue: mockRoomRepository },
        { provide: SessionService, useValue: mockSessionService },
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    roomRepository = module.get(RoomRepository);
    sessionService = module.get(SessionService);
    redisClient = module.get(REDIS_CLIENT);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create a new room successfully', async () => {
      const createDto = { displayName: 'Test User' };
      roomRepository.create.mockResolvedValue(mockRoom as any);

      const result = await service.createRoom(mockSessionId, createDto);

      expect(result).toBeDefined();
      expect(result.roomCode).toBe('ABC123');
      expect(roomRepository.create).toHaveBeenCalledWith(
        mockUserId,
        'Test User',
        10,
        24,
      );
      expect(sessionService.addToHistory).toHaveBeenCalled();
    });

    it('should use custom maxParticipants and expiresInHours', async () => {
      const createDto = {
        displayName: 'Test User',
        maxParticipants: 5,
        expiresInHours: 48,
      };
      roomRepository.create.mockResolvedValue(mockRoom as any);

      await service.createRoom(mockSessionId, createDto);

      expect(roomRepository.create).toHaveBeenCalledWith(
        mockUserId,
        'Test User',
        5,
        48,
      );
    });

    it('should cache the room after creation', async () => {
      const createDto = { displayName: 'Test User' };
      roomRepository.create.mockResolvedValue(mockRoom as any);

      await service.createRoom(mockSessionId, createDto);

      expect(redisClient.setex).toHaveBeenCalled();
    });
  });

  describe('joinRoom', () => {
    it('should join an existing room successfully', async () => {
      const joinDto = { roomCode: 'ABC123', displayName: 'User Two' };
      const newUserId = 'user-2';
      sessionService.getOrCreateUserId = jest.fn().mockResolvedValue(newUserId);
      roomRepository.findByRoomCode.mockResolvedValue(mockRoom as any);
      roomRepository.addParticipant.mockResolvedValue({
        ...mockRoom,
        participants: [
          ...mockRoom.participants,
          { userId: newUserId, displayName: 'User Two', isActive: true },
        ],
      } as any);

      const result = await service.joinRoom(mockSessionId, joinDto);

      expect(result).toBeDefined();
      expect(roomRepository.addParticipant).toHaveBeenCalled();
    });

    it('should throw RoomNotFoundException for non-existent room', async () => {
      const joinDto = { roomCode: 'INVALID', displayName: 'User Two' };
      roomRepository.findByRoomCode.mockResolvedValue(null);

      await expect(service.joinRoom(mockSessionId, joinDto)).rejects.toThrow(
        RoomNotFoundException,
      );
    });

    it('should throw RoomClosedException for closed room', async () => {
      const joinDto = { roomCode: 'ABC123', displayName: 'User Two' };
      roomRepository.findByRoomCode.mockResolvedValue({
        ...mockRoom,
        status: RoomStatus.CLOSED,
      } as any);

      await expect(service.joinRoom(mockSessionId, joinDto)).rejects.toThrow(
        RoomClosedException,
      );
    });

    it('should throw RoomFullException when room has max participants', async () => {
      const joinDto = { roomCode: 'ABC123', displayName: 'User Three' };
      const newUserId = 'user-3';
      sessionService.getOrCreateUserId = jest.fn().mockResolvedValue(newUserId);
      roomRepository.findByRoomCode.mockResolvedValue({
        ...mockRoom,
        participants: [
          { userId: 'user-1', displayName: 'User One', isActive: true },
          { userId: 'user-2', displayName: 'User Two', isActive: true },
        ],
      } as any);

      await expect(service.joinRoom(mockSessionId, joinDto)).rejects.toThrow(
        RoomFullException,
      );
    });

    it('should reactivate existing inactive participant', async () => {
      const joinDto = { roomCode: 'ABC123', displayName: 'User One' };
      roomRepository.findByRoomCode.mockResolvedValue({
        ...mockRoom,
        participants: [
          { userId: mockUserId, displayName: 'User One', isActive: false },
        ],
      } as any);
      roomRepository.updateParticipantStatus.mockResolvedValue(mockRoom as any);

      await service.joinRoom(mockSessionId, joinDto);

      expect(roomRepository.updateParticipantStatus).toHaveBeenCalledWith(
        mockRoom._id,
        mockUserId,
        true,
      );
    });
  });

  describe('leaveRoom', () => {
    it('should mark participant as inactive', async () => {
      roomRepository.findById.mockResolvedValue(mockRoom as any);
      roomRepository.updateParticipantStatus.mockResolvedValue({
        ...mockRoom,
        participants: [
          { ...mockRoom.participants[0], isActive: false, leftAt: new Date() },
        ],
      } as any);

      const result = await service.leaveRoom(mockSessionId, 'room-id-123');

      expect(result).toBeDefined();
      expect(roomRepository.updateParticipantStatus).toHaveBeenCalledWith(
        'room-id-123',
        mockUserId,
        false,
      );
    });

    it('should throw RoomNotFoundException for non-existent room', async () => {
      roomRepository.findById.mockResolvedValue(null);

      await expect(
        service.leaveRoom(mockSessionId, 'invalid-room'),
      ).rejects.toThrow(RoomNotFoundException);
    });

    it('should throw UserNotInRoomException if user is not a participant', async () => {
      const differentUserId = 'different-user';
      sessionService.getUserId = jest.fn().mockResolvedValue(differentUserId);
      roomRepository.findById.mockResolvedValue(mockRoom as any);

      await expect(
        service.leaveRoom(mockSessionId, 'room-id-123'),
      ).rejects.toThrow(UserNotInRoomException);
    });

    it('should close room when all participants leave', async () => {
      roomRepository.findById.mockResolvedValue({
        ...mockRoom,
        participants: [
          { userId: mockUserId, displayName: 'User One', isActive: true },
        ],
      } as any);
      roomRepository.updateParticipantStatus.mockResolvedValue({
        ...mockRoom,
        participants: [
          { userId: mockUserId, displayName: 'User One', isActive: false },
        ],
      } as any);
      roomRepository.updateStatus.mockResolvedValue({
        ...mockRoom,
        status: RoomStatus.CLOSED,
      } as any);

      await service.leaveRoom(mockSessionId, 'room-id-123');

      expect(roomRepository.updateStatus).toHaveBeenCalledWith(
        'room-id-123',
        RoomStatus.CLOSED,
      );
    });
  });

  describe('getRoomById', () => {
    it('should return room from cache if available', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify(mockRoom));

      const result = await service.getRoomById('room-id-123');

      expect(result).toBeDefined();
      expect(roomRepository.findById).not.toHaveBeenCalled();
    });

    it('should fetch from database if not in cache', async () => {
      redisClient.get.mockResolvedValue(null);
      roomRepository.findById.mockResolvedValue(mockRoom as any);

      const result = await service.getRoomById('room-id-123');

      expect(result).toBeDefined();
      expect(roomRepository.findById).toHaveBeenCalledWith('room-id-123');
    });

    it('should throw RoomNotFoundException for non-existent room', async () => {
      redisClient.get.mockResolvedValue(null);
      roomRepository.findById.mockResolvedValue(null);

      await expect(service.getRoomById('invalid-room')).rejects.toThrow(
        RoomNotFoundException,
      );
    });
  });

  describe('closeRoom', () => {
    it('should close room when user is a participant', async () => {
      roomRepository.findById.mockResolvedValue(mockRoom as any);
      roomRepository.closeRoom.mockResolvedValue({
        ...mockRoom,
        status: RoomStatus.CLOSED,
      } as any);

      const result = await service.closeRoom(mockSessionId, 'room-id-123');

      expect(result.status).toBe(RoomStatus.CLOSED);
      expect(roomRepository.closeRoom).toHaveBeenCalledWith('room-id-123');
    });

    it('should throw UserNotInRoomException if user is not a participant', async () => {
      sessionService.getUserId = jest.fn().mockResolvedValue('different-user');
      roomRepository.findById.mockResolvedValue(mockRoom as any);

      await expect(
        service.closeRoom(mockSessionId, 'room-id-123'),
      ).rejects.toThrow(UserNotInRoomException);
    });
  });

  describe('validateParticipant', () => {
    it('should return participant info for valid participant', async () => {
      roomRepository.findById.mockResolvedValue(mockRoom as any);

      const result = await service.validateParticipant(
        mockSessionId,
        'room-id-123',
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.displayName).toBe('User One');
    });

    it('should throw UserNotInRoomException for non-participant', async () => {
      sessionService.getUserId = jest.fn().mockResolvedValue('different-user');
      roomRepository.findById.mockResolvedValue(mockRoom as any);

      await expect(
        service.validateParticipant(mockSessionId, 'room-id-123'),
      ).rejects.toThrow(UserNotInRoomException);
    });
  });
});
