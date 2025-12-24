/**
 * @fileoverview History Service Unit Tests
 * @description Comprehensive tests for HistoryService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HistoryService } from './history.service';
import { SessionService } from '../../session/services/session.service';
import { RoomService } from '../../room/services/room.service';
import { MessageService } from '../../message/services/message.service';
import { RoomStatus } from '../../room/schemas/room.schema';

describe('HistoryService', () => {
  let service: HistoryService;
  let sessionService: jest.Mocked<SessionService>;
  let roomService: jest.Mocked<RoomService>;
  let messageService: jest.Mocked<MessageService>;

  const mockSessionId = 'session-123';
  const mockUserId = 'user-123';

  const mockRoom = {
    _id: 'room-1',
    roomId: 'room-1',
    roomCode: 'ABC123',
    status: RoomStatus.ACTIVE,
    participants: [
      { userId: mockUserId, displayName: 'User One', isActive: true },
      { userId: 'user-2', displayName: 'User Two', isActive: true },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    messageId: 'msg-1',
    roomId: 'room-1',
    content: 'Last message',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockSessionService = {
      getUserId: jest.fn().mockResolvedValue(mockUserId),
      getChatHistory: jest.fn().mockResolvedValue({
        chatHistory: ['room-1', 'room-2'],
        archivedChats: ['room-3'],
        deletedChats: [],
      }),
      archiveChat: jest.fn().mockResolvedValue(undefined),
      unarchiveChat: jest.fn().mockResolvedValue(undefined),
      deleteFromHistory: jest.fn().mockResolvedValue(undefined),
      isRoomArchived: jest.fn().mockResolvedValue(false),
    };

    const mockRoomService = {
      getRoomById: jest.fn().mockResolvedValue(mockRoom),
      getRoomsByIds: jest.fn().mockResolvedValue([mockRoom]),
    };

    const mockMessageService = {
      getLastMessage: jest.fn().mockResolvedValue(mockMessage),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        { provide: SessionService, useValue: mockSessionService },
        { provide: RoomService, useValue: mockRoomService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
    sessionService = module.get(SessionService);
    roomService = module.get(RoomService);
    messageService = module.get(MessageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should return chat history with room details', async () => {
      const result = await service.getHistory(mockSessionId, false, false);

      expect(result).toBeDefined();
      expect(result.chats).toBeDefined();
      expect(sessionService.getChatHistory).toHaveBeenCalledWith(
        mockSessionId,
        false,
        false,
      );
    });

    it('should include archived chats when includeArchived is true', async () => {
      sessionService.getChatHistory.mockResolvedValue({
        chatHistory: ['room-1', 'room-2', 'room-3'],
        archivedChats: ['room-3'],
        deletedChats: [],
      });

      const result = await service.getHistory(mockSessionId, true, false);

      expect(result.chats).toBeDefined();
      expect(sessionService.getChatHistory).toHaveBeenCalledWith(
        mockSessionId,
        true,
        false,
      );
    });

    it('should return only archived chats when archivedOnly is true', async () => {
      sessionService.getChatHistory.mockResolvedValue({
        chatHistory: [],
        archivedChats: ['room-3'],
        deletedChats: [],
      });

      const result = await service.getHistory(mockSessionId, false, true);

      expect(sessionService.getChatHistory).toHaveBeenCalledWith(
        mockSessionId,
        false,
        true,
      );
    });

    it('should return empty array for new user with no history', async () => {
      sessionService.getUserId.mockResolvedValue(null);

      const result = await service.getHistory(mockSessionId, false, false);

      expect(result.chats).toEqual([]);
    });

    it('should populate chat items with room and message details', async () => {
      roomService.getRoomsByIds.mockResolvedValue([mockRoom] as any);
      messageService.getLastMessage.mockResolvedValue(mockMessage as any);
      sessionService.isRoomArchived.mockResolvedValue(false);

      const result = await service.getHistory(mockSessionId, false, false);

      expect(result.chats[0]).toMatchObject({
        roomId: expect.any(String),
        roomCode: 'ABC123',
        status: RoomStatus.ACTIVE,
        isArchived: false,
      });
    });

    it('should identify other participant correctly', async () => {
      roomService.getRoomsByIds.mockResolvedValue([mockRoom] as any);

      const result = await service.getHistory(mockSessionId, false, false);

      expect(result.chats[0].otherParticipant).toBe('User Two');
    });

    it('should handle rooms where user is the only participant', async () => {
      const singleParticipantRoom = {
        ...mockRoom,
        participants: [
          { userId: mockUserId, displayName: 'User One', isActive: true },
        ],
      };
      roomService.getRoomsByIds.mockResolvedValue([singleParticipantRoom] as any);

      const result = await service.getHistory(mockSessionId, false, false);

      expect(result.chats[0].otherParticipant).toBeNull();
    });
  });

  describe('archiveChat', () => {
    it('should archive a chat successfully', async () => {
      const result = await service.archiveChat(mockSessionId, 'room-1');

      expect(result).toBeDefined();
      expect(result.roomId).toBe('room-1');
      expect(result.archived).toBe(true);
      expect(sessionService.archiveChat).toHaveBeenCalledWith(
        mockSessionId,
        'room-1',
      );
    });
  });

  describe('unarchiveChat', () => {
    it('should unarchive a chat successfully', async () => {
      const result = await service.unarchiveChat(mockSessionId, 'room-3');

      expect(result).toBeDefined();
      expect(result.roomId).toBe('room-3');
      expect(result.archived).toBe(false);
      expect(sessionService.unarchiveChat).toHaveBeenCalledWith(
        mockSessionId,
        'room-3',
      );
    });
  });

  describe('deleteChat', () => {
    it('should delete chat from history', async () => {
      const result = await service.deleteChat(mockSessionId, 'room-1');

      expect(result).toBeDefined();
      expect(result.roomId).toBe('room-1');
      expect(result.deleted).toBe(true);
      expect(sessionService.deleteFromHistory).toHaveBeenCalledWith(
        mockSessionId,
        'room-1',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle room lookup failures gracefully', async () => {
      roomService.getRoomsByIds.mockResolvedValue([]);
      sessionService.getChatHistory.mockResolvedValue({
        chatHistory: ['room-not-found'],
        archivedChats: [],
        deletedChats: [],
      });

      const result = await service.getHistory(mockSessionId, false, false);

      // Should filter out rooms that couldn't be found
      expect(result.chats).toHaveLength(0);
    });

    it('should handle message lookup failures gracefully', async () => {
      roomService.getRoomsByIds.mockResolvedValue([mockRoom] as any);
      messageService.getLastMessage.mockResolvedValue(null);

      const result = await service.getHistory(mockSessionId, false, false);

      expect(result.chats[0].lastMessage).toBeNull();
      expect(result.chats[0].lastMessageAt).toBeNull();
    });

    it('should sort chats by last message date (newest first)', async () => {
      const oldDate = new Date('2025-01-01');
      const newDate = new Date('2025-12-23');

      const room1 = { ...mockRoom, _id: 'room-1', roomId: 'room-1' };
      const room2 = { ...mockRoom, _id: 'room-2', roomId: 'room-2', roomCode: 'DEF456' };

      roomService.getRoomsByIds.mockResolvedValue([room1, room2] as any);
      messageService.getLastMessage
        .mockResolvedValueOnce({ ...mockMessage, createdAt: oldDate } as any)
        .mockResolvedValueOnce({ ...mockMessage, createdAt: newDate } as any);

      sessionService.getChatHistory.mockResolvedValue({
        chatHistory: ['room-1', 'room-2'],
        archivedChats: [],
        deletedChats: [],
      });

      const result = await service.getHistory(mockSessionId, false, false);

      // Room with newer message should come first
      expect(result.chats[0].roomCode).toBe('DEF456');
      expect(result.chats[1].roomCode).toBe('ABC123');
    });
  });
});
