/**
 * @fileoverview Session Service Unit Tests
 * @description Comprehensive tests for SessionService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SessionService } from './session.service';
import { UserSession } from '../schemas/session.schema';
import { REDIS_CLIENT } from '../../../config/redis.module';

describe('SessionService', () => {
  let service: SessionService;
  let sessionModel: any;
  let redisClient: any;

  const mockSession = {
    _id: 'session-123',
    sessionId: 'session-123',
    userId: 'user-123',
    socketId: null,
    isOnline: false,
    chatHistory: ['room-1', 'room-2'],
    archivedChats: ['room-3'],
    deletedChats: [],
    createdAt: new Date(),
    lastSeen: new Date(),
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const mockSessionModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      }),
      create: jest.fn().mockResolvedValue(mockSession),
    };

    const mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      status: 'ready',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: getModelToken(UserSession.name), useValue: mockSessionModel },
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionModel = module.get(getModelToken(UserSession.name));
    redisClient = module.get(REDIS_CLIENT);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateUserId', () => {
    it('should return existing user ID from cache', async () => {
      redisClient.get.mockResolvedValue('cached-user-123');

      const result = await service.getOrCreateUserId('session-123');

      expect(result).toBe('cached-user-123');
    });

    it('should return existing user ID from database if not in cache', async () => {
      redisClient.get.mockResolvedValue(null);
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.getOrCreateUserId('session-123');

      expect(result).toBe('user-123');
      expect(redisClient.setex).toHaveBeenCalled();
    });

    it('should create new user ID if session has no userId', async () => {
      redisClient.get.mockResolvedValue(null);
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockSession, userId: null }),
      });

      const result = await service.getOrCreateUserId('session-123');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(sessionModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('getUserId', () => {
    it('should return user ID from cache', async () => {
      redisClient.get.mockResolvedValue('cached-user-123');

      const result = await service.getUserId('session-123');

      expect(result).toBe('cached-user-123');
    });

    it('should return user ID from database when not in cache', async () => {
      redisClient.get.mockResolvedValue(null);
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.getUserId('session-123');

      expect(result).toBe('user-123');
    });

    it('should return null for non-existent session', async () => {
      redisClient.get.mockResolvedValue(null);
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getUserId('invalid-session');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreateSession', () => {
    it('should return existing session', async () => {
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.getOrCreateSession('session-123');

      expect(result.session).toBeDefined();
      expect(result.userId).toBeDefined();
    });
  });

  describe('connectSocket', () => {
    it('should update session with socket ID', async () => {
      await service.connectSocket('session-123', 'socket-456');

      expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'session-123' },
        expect.objectContaining({
          socketId: 'socket-456',
          isOnline: true,
        }),
        { upsert: true },
      );
    });
  });

  describe('disconnectSocket', () => {
    it('should clear socket ID and set offline', async () => {
      await service.disconnectSocket('session-123');

      expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'session-123' },
        expect.objectContaining({
          socketId: null,
          isOnline: false,
        }),
      );
    });
  });

  describe('addToHistory', () => {
    it('should add room to chat history', async () => {
      await service.addToHistory('session-123', 'room-new');

      expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'session-123' },
        expect.objectContaining({
          $addToSet: { chatHistory: 'room-new' },
        }),
        expect.any(Object),
      );
    });
  });

  describe('archiveChat', () => {
    it('should archive a chat', async () => {
      await service.archiveChat('session-123', 'room-1');

      expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'session-123' },
        expect.objectContaining({
          $addToSet: { archivedChats: 'room-1' },
        }),
        expect.any(Object),
      );
    });
  });

  describe('unarchiveChat', () => {
    it('should unarchive a chat', async () => {
      await service.unarchiveChat('session-123', 'room-3');

      expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'session-123' },
        expect.objectContaining({
          $pull: { archivedChats: 'room-3' },
        }),
        expect.any(Object),
      );
    });
  });

  describe('deleteFromHistory', () => {
    it('should delete room from history', async () => {
      await service.deleteFromHistory('session-123', 'room-1');

      expect(sessionModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('getChatHistory', () => {
    it('should return chat history for session', async () => {
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.getChatHistory('session-123');

      expect(result).toEqual(['room-1', 'room-2']);
    });

    it('should return empty array for non-existent session', async () => {
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getChatHistory('invalid-session');

      expect(result).toEqual([]);
    });
  });

  describe('getArchivedChats', () => {
    it('should return archived chats for session', async () => {
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.getArchivedChats('session-123');

      expect(result).toEqual(['room-3']);
    });
  });

  describe('Redis failure handling', () => {
    it('should fallback to database when Redis is unavailable', async () => {
      redisClient.get.mockRejectedValue(new Error('Redis unavailable'));
      redisClient.status = 'end';
      sessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.getUserId('session-123');

      expect(result).toBe('user-123');
    });
  });
});
