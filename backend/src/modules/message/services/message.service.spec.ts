/**
 * @fileoverview Message Service Unit Tests
 * @description Comprehensive tests for MessageService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MessageService } from './message.service';
import { MessageRepository } from '../repositories/message.repository';
import { RoomService } from '../../room/services/room.service';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { ContentType, ReactionType } from '../schemas/message.schema';
import {
  MessageNotFoundException,
  DuplicateReactionException,
} from '../../../common/exceptions/business.exceptions';

describe('MessageService', () => {
  let service: MessageService;
  let messageRepository: jest.Mocked<MessageRepository>;
  let roomService: jest.Mocked<RoomService>;
  let redisClient: jest.Mocked<any>;
  let messageQueue: jest.Mocked<any>;

  const mockSessionId = 'session-123';
  const mockUserId = 'user-123';
  const mockRoomId = 'room-123';

  const mockMessage = {
    _id: 'msg-123',
    messageId: 'msg-123',
    roomId: mockRoomId,
    senderId: mockUserId,
    senderName: 'User One',
    content: 'Hello!',
    contentType: ContentType.TEXT,
    isDeleted: false,
    deletedBy: null,
    deletionPlaceholder: null,
    reactions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockParticipant = {
    userId: mockUserId,
    displayName: 'User One',
    isActive: true,
  };

  beforeEach(async () => {
    const mockMessageRepository = {
      create: jest.fn().mockResolvedValue(mockMessage),
      findById: jest.fn().mockResolvedValue(mockMessage),
      getMessages: jest.fn().mockResolvedValue({
        items: [mockMessage],
        hasMore: false,
        nextCursor: null,
        prevCursor: null,
      }),
      softDelete: jest.fn().mockResolvedValue({
        ...mockMessage,
        isDeleted: true,
        content: '',
        deletedBy: mockUserId,
        deletionPlaceholder: 'Message deleted by User One',
      }),
      addReaction: jest.fn().mockResolvedValue({
        ...mockMessage,
        reactions: [{ type: ReactionType.LIKE, userId: mockUserId, createdAt: new Date() }],
      }),
      removeReaction: jest.fn().mockResolvedValue({
        ...mockMessage,
        reactions: [],
      }),
      hasUserReacted: jest.fn().mockResolvedValue(false),
    };

    const mockRoomService = {
      getParticipant: jest.fn().mockResolvedValue(mockParticipant),
    };

    const mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: MessageRepository, useValue: mockMessageRepository },
        { provide: RoomService, useValue: mockRoomService },
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
        { provide: getQueueToken('message-persistence'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    messageRepository = module.get(MessageRepository);
    roomService = module.get(RoomService);
    redisClient = module.get(REDIS_CLIENT);
    messageQueue = module.get(getQueueToken('message-persistence'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const dto = {
        roomId: mockRoomId,
        content: 'Hello!',
        contentType: ContentType.TEXT,
      };

      const result = await service.sendMessage(mockSessionId, dto);

      expect(result).toBeDefined();
      expect(result.messageId).toBe('msg-123');
      expect(result.content).toBe('Hello!');
      expect(messageRepository.create).toHaveBeenCalled();
    });

    it('should throw error if user is not in room', async () => {
      roomService.getParticipant.mockResolvedValue(null);

      const dto = {
        roomId: 'invalid-room',
        content: 'Hello!',
      };

      await expect(service.sendMessage(mockSessionId, dto)).rejects.toThrow();
    });

    it('should use default content type if not provided', async () => {
      const dto = {
        roomId: mockRoomId,
        content: 'Hello!',
      };

      await service.sendMessage(mockSessionId, dto);

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: ContentType.TEXT,
        }),
      );
    });

    it('should support emoji content type', async () => {
      const dto = {
        roomId: mockRoomId,
        content: '👋',
        contentType: ContentType.EMOJI,
      };

      await service.sendMessage(mockSessionId, dto);

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: ContentType.EMOJI,
        }),
      );
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      const result = await service.getMessages(mockSessionId, mockRoomId, {
        limit: 50,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should pass pagination options to repository', async () => {
      await service.getMessages(mockSessionId, mockRoomId, {
        limit: 20,
        before: 'cursor-123',
      });

      expect(messageRepository.getMessages).toHaveBeenCalledWith(
        mockRoomId,
        expect.objectContaining({
          limit: 20,
          before: 'cursor-123',
        }),
      );
    });

    it('should indicate hasMore when more messages exist', async () => {
      messageRepository.getMessages.mockResolvedValue({
        items: [mockMessage],
        hasMore: true,
        nextCursor: 'next-cursor-123',
        prevCursor: null,
      });

      const result = await service.getMessages(mockSessionId, mockRoomId, {
        limit: 1,
      });

      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).toBe('next-cursor-123');
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete a message', async () => {
      const result = await service.deleteMessage(mockSessionId, 'msg-123');

      expect(result.isDeleted).toBe(true);
      expect(messageRepository.softDelete).toHaveBeenCalledWith(
        'msg-123',
        mockUserId,
        'User One',
      );
    });

    it('should throw MessageNotFoundException for non-existent message', async () => {
      messageRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteMessage(mockSessionId, 'invalid-msg'),
      ).rejects.toThrow(MessageNotFoundException);
    });

    it('should include deletion placeholder', async () => {
      const result = await service.deleteMessage(mockSessionId, 'msg-123');

      expect(result.deletionPlaceholder).toContain('Message deleted by');
    });
  });

  describe('addReaction', () => {
    it('should add a reaction successfully', async () => {
      const result = await service.addReaction(
        mockSessionId,
        'msg-123',
        ReactionType.LIKE,
      );

      expect(result.reactions).toHaveLength(1);
      expect(messageRepository.addReaction).toHaveBeenCalled();
      expect(messageQueue.add).toHaveBeenCalledWith(
        'update-reactions',
        expect.any(Object),
      );
    });

    it('should throw MessageNotFoundException for non-existent message', async () => {
      messageRepository.findById.mockResolvedValue(null);

      await expect(
        service.addReaction(mockSessionId, 'invalid-msg', ReactionType.LIKE),
      ).rejects.toThrow(MessageNotFoundException);
    });

    it('should throw DuplicateReactionException for duplicate reaction', async () => {
      messageRepository.hasUserReacted.mockResolvedValue(true);

      await expect(
        service.addReaction(mockSessionId, 'msg-123', ReactionType.LIKE),
      ).rejects.toThrow(DuplicateReactionException);
    });

    it('should allow different reaction types from same user', async () => {
      messageRepository.hasUserReacted.mockResolvedValue(false);
      messageRepository.addReaction.mockResolvedValue({
        ...mockMessage,
        reactions: [
          { type: ReactionType.LIKE, userId: mockUserId, createdAt: new Date() },
          { type: ReactionType.LOVE, userId: mockUserId, createdAt: new Date() },
        ],
      });

      const result = await service.addReaction(
        mockSessionId,
        'msg-123',
        ReactionType.LOVE,
      );

      expect(result.reactions).toHaveLength(2);
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction successfully', async () => {
      const result = await service.removeReaction(
        mockSessionId,
        'msg-123',
        ReactionType.LIKE,
      );

      expect(result.reactions).toHaveLength(0);
      expect(messageRepository.removeReaction).toHaveBeenCalledWith(
        'msg-123',
        mockUserId,
        ReactionType.LIKE,
      );
    });

    it('should throw MessageNotFoundException for non-existent message', async () => {
      messageRepository.findById.mockResolvedValue(null);

      await expect(
        service.removeReaction(mockSessionId, 'invalid-msg', ReactionType.LIKE),
      ).rejects.toThrow(MessageNotFoundException);
    });
  });

  describe('getMessageById', () => {
    it('should return message by ID', async () => {
      const result = await service.getMessageById(mockSessionId, 'msg-123');

      expect(result.messageId).toBe('msg-123');
      expect(messageRepository.findById).toHaveBeenCalledWith('msg-123');
    });

    it('should throw MessageNotFoundException for non-existent message', async () => {
      messageRepository.findById.mockResolvedValue(null);

      await expect(
        service.getMessageById(mockSessionId, 'invalid-msg'),
      ).rejects.toThrow(MessageNotFoundException);
    });
  });
});
