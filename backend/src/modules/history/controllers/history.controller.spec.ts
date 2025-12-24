/**
 * @fileoverview History Controller Unit Tests
 * @description Comprehensive tests for HistoryController endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HistoryController } from './history.controller';
import { HistoryService } from '../services/history.service';
import { RoomStatus } from '../../room/schemas/room.schema';

describe('HistoryController', () => {
  let controller: HistoryController;
  let historyService: jest.Mocked<HistoryService>;

  const mockSessionId = 'session-123';

  const mockHistoryItem = {
    roomId: 'room-123',
    roomCode: 'ABC123',
    displayName: 'User One',
    lastMessage: 'Hello!',
    lastMessageAt: new Date(),
    status: RoomStatus.ACTIVE,
    isArchived: false,
    participantCount: 2,
    unreadCount: 0,
  };

  const mockPaginatedHistory = {
    items: [mockHistoryItem],
    total: 1,
    page: 1,
    limit: 20,
    hasMore: false,
  };

  beforeEach(async () => {
    const mockHistoryService = {
      getHistory: jest.fn().mockResolvedValue(mockPaginatedHistory),
      archiveChat: jest.fn().mockResolvedValue({ success: true }),
      unarchiveChat: jest.fn().mockResolvedValue({ success: true }),
      deleteChat: jest.fn().mockResolvedValue({ success: true }),
      getArchivedChats: jest.fn().mockResolvedValue(mockPaginatedHistory),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [{ provide: HistoryService, useValue: mockHistoryService }],
    }).compile();

    controller = module.get<HistoryController>(HistoryController);
    historyService = module.get(HistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should return paginated chat history', async () => {
      const result = await controller.getHistory(mockSessionId);

      expect(result).toEqual(mockPaginatedHistory);
      expect(historyService.getHistory).toHaveBeenCalledWith(
        mockSessionId,
        expect.any(Object),
      );
    });

    it('should pass pagination parameters', async () => {
      const page = 2;
      const limit = 10;

      await controller.getHistory(mockSessionId, page, limit);

      expect(historyService.getHistory).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({ page, limit }),
      );
    });

    it('should use default pagination if not provided', async () => {
      await controller.getHistory(mockSessionId);

      expect(historyService.getHistory).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });

    it('should filter by status when provided', async () => {
      await controller.getHistory(mockSessionId, 1, 20, RoomStatus.ACTIVE);

      expect(historyService.getHistory).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({ status: RoomStatus.ACTIVE }),
      );
    });
  });

  describe('getArchivedChats', () => {
    it('should return archived chats', async () => {
      const archivedHistory = {
        ...mockPaginatedHistory,
        items: [{ ...mockHistoryItem, isArchived: true }],
      };
      historyService.getArchivedChats.mockResolvedValue(archivedHistory);

      const result = await controller.getArchivedChats(mockSessionId);

      expect(result).toEqual(archivedHistory);
      expect(historyService.getArchivedChats).toHaveBeenCalledWith(
        mockSessionId,
        expect.any(Object),
      );
    });

    it('should pass pagination to archived chats', async () => {
      await controller.getArchivedChats(mockSessionId, 2, 5);

      expect(historyService.getArchivedChats).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({ page: 2, limit: 5 }),
      );
    });
  });

  describe('archiveChat', () => {
    it('should archive a chat', async () => {
      const roomId = 'room-123';

      const result = await controller.archiveChat(mockSessionId, roomId);

      expect(result).toEqual({ success: true });
      expect(historyService.archiveChat).toHaveBeenCalledWith(
        mockSessionId,
        roomId,
      );
    });

    it('should throw error if archive fails', async () => {
      historyService.archiveChat.mockRejectedValue(new Error('Archive failed'));

      await expect(
        controller.archiveChat(mockSessionId, 'room-123'),
      ).rejects.toThrow('Archive failed');
    });
  });

  describe('unarchiveChat', () => {
    it('should unarchive a chat', async () => {
      const roomId = 'room-123';

      const result = await controller.unarchiveChat(mockSessionId, roomId);

      expect(result).toEqual({ success: true });
      expect(historyService.unarchiveChat).toHaveBeenCalledWith(
        mockSessionId,
        roomId,
      );
    });

    it('should throw error if unarchive fails', async () => {
      historyService.unarchiveChat.mockRejectedValue(
        new Error('Unarchive failed'),
      );

      await expect(
        controller.unarchiveChat(mockSessionId, 'room-123'),
      ).rejects.toThrow('Unarchive failed');
    });
  });

  describe('deleteChat', () => {
    it('should delete a chat from history', async () => {
      const roomId = 'room-123';

      const result = await controller.deleteChat(mockSessionId, roomId);

      expect(result).toEqual({ success: true });
      expect(historyService.deleteChat).toHaveBeenCalledWith(
        mockSessionId,
        roomId,
      );
    });

    it('should throw error if delete fails', async () => {
      historyService.deleteChat.mockRejectedValue(new Error('Delete failed'));

      await expect(
        controller.deleteChat(mockSessionId, 'room-123'),
      ).rejects.toThrow('Delete failed');
    });

    it('should handle non-existent room gracefully', async () => {
      historyService.deleteChat.mockRejectedValue(new Error('Room not found'));

      await expect(
        controller.deleteChat(mockSessionId, 'non-existent'),
      ).rejects.toThrow('Room not found');
    });
  });
});
