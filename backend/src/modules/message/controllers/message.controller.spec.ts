/**
 * @fileoverview Message Controller Unit Tests
 * @description Comprehensive tests for MessageController HTTP endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MessageController } from './message.controller';
import { MessageService } from '../services/message.service';
import { ContentType, ReactionType } from '../schemas/message.schema';
import {
  MessageNotFoundException,
  UserNotInRoomException,
  SessionNotFoundException,
  DuplicateReactionException,
} from '../../../common/exceptions/business.exceptions';

describe('MessageController', () => {
  let controller: MessageController;
  let messageService: jest.Mocked<MessageService>;

  const mockMessage = {
    messageId: 'msg-123',
    roomId: 'room-123',
    senderId: 'user-1',
    senderName: 'User One',
    content: 'Hello, World!',
    contentType: ContentType.TEXT,
    isDeleted: false,
    isOwnMessage: true,
    reactions: [],
    createdAt: new Date(),
  };

  const mockSessionId = 'session-123';

  beforeEach(async () => {
    const mockMessageService = {
      sendMessage: jest.fn(),
      getMessages: jest.fn(),
      deleteMessage: jest.fn(),
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [{ provide: MessageService, useValue: mockMessageService }],
    }).compile();

    controller = module.get<MessageController>(MessageController);
    messageService = module.get(MessageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /messages', () => {
    it('should send a message successfully', async () => {
      const sendDto = {
        roomId: 'room-123',
        content: 'Hello, World!',
        contentType: ContentType.TEXT,
      };
      messageService.sendMessage.mockResolvedValue(mockMessage as any);

      const result = await controller.sendMessage(mockSessionId, sendDto);

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello, World!');
      expect(messageService.sendMessage).toHaveBeenCalledWith(
        mockSessionId,
        sendDto,
      );
    });

    it('should throw SessionNotFoundException when session is missing', async () => {
      const sendDto = {
        roomId: 'room-123',
        content: 'Hello!',
      };

      await expect(controller.sendMessage('', sendDto)).rejects.toThrow(
        SessionNotFoundException,
      );
    });

    it('should throw UserNotInRoomException when user not in room', async () => {
      const sendDto = {
        roomId: 'room-123',
        content: 'Hello!',
      };
      messageService.sendMessage.mockRejectedValue(
        new UserNotInRoomException('room-123'),
      );

      await expect(
        controller.sendMessage(mockSessionId, sendDto),
      ).rejects.toThrow(UserNotInRoomException);
    });
  });

  describe('GET /messages', () => {
    it('should return paginated messages', async () => {
      const paginatedResponse = {
        messages: [mockMessage],
        hasMore: false,
        nextCursor: null,
      };
      messageService.getMessages.mockResolvedValue(paginatedResponse as any);

      const result = await controller.getMessages(mockSessionId, {
        roomId: 'room-123',
        limit: 50,
      });

      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('should pass pagination parameters correctly', async () => {
      const paginatedResponse = {
        messages: [],
        hasMore: false,
        nextCursor: null,
      };
      messageService.getMessages.mockResolvedValue(paginatedResponse as any);

      await controller.getMessages(mockSessionId, {
        roomId: 'room-123',
        limit: 25,
        before: 'msg-456',
      });

      expect(messageService.getMessages).toHaveBeenCalledWith(
        mockSessionId,
        'room-123',
        { limit: 25, before: 'msg-456' },
      );
    });

    it('should use default limit when not specified', async () => {
      const paginatedResponse = {
        messages: [],
        hasMore: false,
        nextCursor: null,
      };
      messageService.getMessages.mockResolvedValue(paginatedResponse as any);

      await controller.getMessages(mockSessionId, {
        roomId: 'room-123',
      });

      expect(messageService.getMessages).toHaveBeenCalledWith(
        mockSessionId,
        'room-123',
        expect.objectContaining({ limit: expect.any(Number) }),
      );
    });
  });

  describe('DELETE /messages/:messageId', () => {
    it('should delete message successfully', async () => {
      const deleteResponse = {
        messageId: 'msg-123',
        deleted: true,
      };
      messageService.deleteMessage.mockResolvedValue(deleteResponse as any);

      const result = await controller.deleteMessage(mockSessionId, 'msg-123');

      expect(result).toBeDefined();
      expect(result.deleted).toBe(true);
      expect(messageService.deleteMessage).toHaveBeenCalledWith(
        mockSessionId,
        'msg-123',
      );
    });

    it('should throw MessageNotFoundException for non-existent message', async () => {
      messageService.deleteMessage.mockRejectedValue(
        new MessageNotFoundException('invalid-msg'),
      );

      await expect(
        controller.deleteMessage(mockSessionId, 'invalid-msg'),
      ).rejects.toThrow(MessageNotFoundException);
    });
  });

  describe('POST /messages/:messageId/reactions', () => {
    it('should add reaction successfully', async () => {
      const reactionResponse = {
        messageId: 'msg-123',
        type: ReactionType.LIKE,
        count: 1,
      };
      messageService.addReaction.mockResolvedValue(reactionResponse as any);

      const result = await controller.addReaction(mockSessionId, 'msg-123', {
        type: ReactionType.LIKE,
      });

      expect(result).toBeDefined();
      expect(result.type).toBe(ReactionType.LIKE);
      expect(messageService.addReaction).toHaveBeenCalledWith(
        mockSessionId,
        'msg-123',
        ReactionType.LIKE,
      );
    });

    it('should throw DuplicateReactionException for duplicate reaction', async () => {
      messageService.addReaction.mockRejectedValue(
        new DuplicateReactionException('msg-123', ReactionType.LIKE),
      );

      await expect(
        controller.addReaction(mockSessionId, 'msg-123', {
          type: ReactionType.LIKE,
        }),
      ).rejects.toThrow(DuplicateReactionException);
    });

    it('should throw MessageNotFoundException for non-existent message', async () => {
      messageService.addReaction.mockRejectedValue(
        new MessageNotFoundException('invalid-msg'),
      );

      await expect(
        controller.addReaction(mockSessionId, 'invalid-msg', {
          type: ReactionType.LIKE,
        }),
      ).rejects.toThrow(MessageNotFoundException);
    });
  });

  describe('DELETE /messages/:messageId/reactions/:type', () => {
    it('should remove reaction successfully', async () => {
      const reactionResponse = {
        messageId: 'msg-123',
        type: ReactionType.LIKE,
        count: 0,
      };
      messageService.removeReaction.mockResolvedValue(reactionResponse as any);

      const result = await controller.removeReaction(
        mockSessionId,
        'msg-123',
        ReactionType.LIKE,
      );

      expect(result).toBeDefined();
      expect(result.count).toBe(0);
      expect(messageService.removeReaction).toHaveBeenCalledWith(
        mockSessionId,
        'msg-123',
        ReactionType.LIKE,
      );
    });

    it('should throw MessageNotFoundException for non-existent message', async () => {
      messageService.removeReaction.mockRejectedValue(
        new MessageNotFoundException('invalid-msg'),
      );

      await expect(
        controller.removeReaction(mockSessionId, 'invalid-msg', ReactionType.LIKE),
      ).rejects.toThrow(MessageNotFoundException);
    });
  });

  describe('All reaction types', () => {
    const reactionTypes = [
      ReactionType.LIKE,
      ReactionType.LOVE,
      ReactionType.LAUGH,
      ReactionType.WOW,
      ReactionType.SAD,
      ReactionType.ANGRY,
    ];

    reactionTypes.forEach((reactionType) => {
      it(`should handle ${reactionType} reaction`, async () => {
        const reactionResponse = {
          messageId: 'msg-123',
          type: reactionType,
          count: 1,
        };
        messageService.addReaction.mockResolvedValue(reactionResponse as any);

        const result = await controller.addReaction(mockSessionId, 'msg-123', {
          type: reactionType,
        });

        expect(result.type).toBe(reactionType);
      });
    });
  });
});
