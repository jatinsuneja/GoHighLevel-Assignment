/**
 * @fileoverview Room Controller Unit Tests
 * @description Comprehensive tests for RoomController HTTP endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RoomController } from './room.controller';
import { RoomService } from '../services/room.service';
import { RoomStatus } from '../schemas/room.schema';
import {
  RoomNotFoundException,
  RoomFullException,
  SessionNotFoundException,
} from '../../../common/exceptions/business.exceptions';

describe('RoomController', () => {
  let controller: RoomController;
  let roomService: jest.Mocked<RoomService>;

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
    expiresAt: null,
  };

  const mockSessionId = 'session-123';

  beforeEach(async () => {
    const mockRoomService = {
      createRoom: jest.fn(),
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      getRoomById: jest.fn(),
      getRoomByCode: jest.fn(),
      closeRoom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [{ provide: RoomService, useValue: mockRoomService }],
    }).compile();

    controller = module.get<RoomController>(RoomController);
    roomService = module.get(RoomService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /rooms/create', () => {
    it('should create a room and return room code', async () => {
      const createDto = { displayName: 'Test User' };
      roomService.createRoom.mockResolvedValue(mockRoom as any);

      const result = await controller.createRoom(mockSessionId, createDto);

      expect(result).toBeDefined();
      expect(result.roomId).toBe('room-id-123');
      expect(result.roomCode).toBe('ABC123');
      expect(roomService.createRoom).toHaveBeenCalledWith(
        mockSessionId,
        createDto,
      );
    });

    it('should throw SessionNotFoundException when session header is missing', async () => {
      const createDto = { displayName: 'Test User' };

      await expect(controller.createRoom('', createDto)).rejects.toThrow(
        SessionNotFoundException,
      );
    });

    it('should throw SessionNotFoundException when session header is undefined', async () => {
      const createDto = { displayName: 'Test User' };

      await expect(
        controller.createRoom(undefined as any, createDto),
      ).rejects.toThrow(SessionNotFoundException);
    });
  });

  describe('POST /rooms/join', () => {
    it('should join a room successfully', async () => {
      const joinDto = { roomCode: 'ABC123', displayName: 'User Two' };
      const roomWithTwoParticipants = {
        ...mockRoom,
        participants: [
          ...mockRoom.participants,
          {
            userId: 'user-2',
            displayName: 'User Two',
            joinedAt: new Date(),
            isActive: true,
          },
        ],
      };
      roomService.joinRoom.mockResolvedValue(roomWithTwoParticipants as any);

      const result = await controller.joinRoom(mockSessionId, joinDto);

      expect(result).toBeDefined();
      expect(result.roomCode).toBe('ABC123');
      expect(result.participants).toHaveLength(2);
    });

    it('should throw RoomNotFoundException for invalid room code', async () => {
      const joinDto = { roomCode: 'INVALID', displayName: 'User Two' };
      roomService.joinRoom.mockRejectedValue(
        new RoomNotFoundException('INVALID'),
      );

      await expect(
        controller.joinRoom(mockSessionId, joinDto),
      ).rejects.toThrow(RoomNotFoundException);
    });

    it('should throw RoomFullException when room is full', async () => {
      const joinDto = { roomCode: 'ABC123', displayName: 'User Three' };
      roomService.joinRoom.mockRejectedValue(
        new RoomFullException('ABC123'),
      );

      await expect(
        controller.joinRoom(mockSessionId, joinDto),
      ).rejects.toThrow(RoomFullException);
    });
  });

  describe('POST /rooms/:roomId/leave', () => {
    it('should leave room successfully', async () => {
      const leftRoom = {
        ...mockRoom,
        participants: [
          { ...mockRoom.participants[0], isActive: false, leftAt: new Date() },
        ],
      };
      roomService.leaveRoom.mockResolvedValue(leftRoom as any);

      const result = await controller.leaveRoom(mockSessionId, 'room-id-123');

      expect(result).toBeDefined();
      expect(roomService.leaveRoom).toHaveBeenCalledWith(
        mockSessionId,
        'room-id-123',
      );
    });

    it('should throw RoomNotFoundException for non-existent room', async () => {
      roomService.leaveRoom.mockRejectedValue(
        new RoomNotFoundException('invalid-room'),
      );

      await expect(
        controller.leaveRoom(mockSessionId, 'invalid-room'),
      ).rejects.toThrow(RoomNotFoundException);
    });
  });

  describe('GET /rooms/:roomId', () => {
    it('should return room details', async () => {
      roomService.getRoomById.mockResolvedValue(mockRoom as any);

      const result = await controller.getRoom(mockSessionId, 'room-id-123');

      expect(result).toBeDefined();
      expect(result.roomId).toBe('room-id-123');
      expect(result.roomCode).toBe('ABC123');
      expect(result.status).toBe(RoomStatus.ACTIVE);
    });

    it('should throw RoomNotFoundException for non-existent room', async () => {
      roomService.getRoomById.mockRejectedValue(
        new RoomNotFoundException('invalid-room'),
      );

      await expect(
        controller.getRoom(mockSessionId, 'invalid-room'),
      ).rejects.toThrow(RoomNotFoundException);
    });
  });

  describe('GET /rooms/code/:roomCode', () => {
    it('should return room by room code', async () => {
      roomService.getRoomByCode.mockResolvedValue(mockRoom as any);

      const result = await controller.getRoomByCode(mockSessionId, 'ABC123');

      expect(result).toBeDefined();
      expect(result.roomCode).toBe('ABC123');
    });

    it('should throw RoomNotFoundException for invalid room code', async () => {
      roomService.getRoomByCode.mockRejectedValue(
        new RoomNotFoundException('INVALID'),
      );

      await expect(
        controller.getRoomByCode(mockSessionId, 'INVALID'),
      ).rejects.toThrow(RoomNotFoundException);
    });
  });

  describe('POST /rooms/:roomId/close', () => {
    it('should close room successfully', async () => {
      const closedRoom = { ...mockRoom, status: RoomStatus.CLOSED };
      roomService.closeRoom.mockResolvedValue(closedRoom as any);

      const result = await controller.closeRoom(mockSessionId, 'room-id-123');

      expect(result).toBeDefined();
      expect(result.status).toBe(RoomStatus.CLOSED);
      expect(roomService.closeRoom).toHaveBeenCalledWith(
        mockSessionId,
        'room-id-123',
      );
    });
  });

  describe('Response mapping', () => {
    it('should correctly map room to CreateRoomResponseDto', async () => {
      const createDto = { displayName: 'Test User' };
      roomService.createRoom.mockResolvedValue(mockRoom as any);

      const result = await controller.createRoom(mockSessionId, createDto);

      expect(result).toEqual({
        roomId: 'room-id-123',
        roomCode: 'ABC123',
        createdAt: mockRoom.createdAt,
        expiresAt: null,
      });
    });

    it('should correctly map room to RoomResponseDto with participants', async () => {
      const joinDto = { roomCode: 'ABC123', displayName: 'User Two' };
      roomService.joinRoom.mockResolvedValue(mockRoom as any);

      const result = await controller.joinRoom(mockSessionId, joinDto);

      expect(result.participants).toBeDefined();
      expect(result.participants[0]).toEqual({
        displayName: 'User One',
        isActive: true,
        joinedAt: expect.any(Date),
      });
    });
  });
});
