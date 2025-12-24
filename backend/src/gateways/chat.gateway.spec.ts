/**
 * @fileoverview Chat Gateway Unit Tests
 * @description Comprehensive tests for ChatGateway WebSocket events
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { SessionService } from '../modules/session/services/session.service';
import { RoomService } from '../modules/room/services/room.service';
import { MessageService } from '../modules/message/services/message.service';
import { REDIS_PUBLISHER, REDIS_SUBSCRIBER } from '../config/redis.module';
import { RoomStatus } from '../modules/room/schemas/room.schema';
import { ContentType, ReactionType } from '../modules/message/schemas/message.schema';
import { Server, Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let sessionService: jest.Mocked<SessionService>;
  let roomService: jest.Mocked<RoomService>;
  let messageService: jest.Mocked<MessageService>;

  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';

  const mockRoom = {
    _id: 'room-123',
    roomId: 'room-123',
    roomCode: 'ABC123',
    status: RoomStatus.ACTIVE,
    participants: [
      { userId: mockUserId, displayName: 'User One', isActive: true },
    ],
  };

  const mockMessage = {
    _id: 'msg-123',
    messageId: 'msg-123',
    roomId: 'room-123',
    senderId: mockUserId,
    senderName: 'User One',
    content: 'Hello!',
    contentType: ContentType.TEXT,
    isDeleted: false,
    reactions: [],
    createdAt: new Date(),
  };

  const mockSocket: Partial<Socket> = {
    id: 'socket-123',
    handshake: {
      auth: { sessionId: mockSessionId },
      headers: {},
      query: {},
      time: new Date().toISOString(),
      address: '127.0.0.1',
      xdomain: false,
      secure: false,
      issued: Date.now(),
      url: '/',
    } as any,
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    data: {},
  };

  const mockServer: Partial<Server> = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    in: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const mockSessionService = {
      getOrCreateUserId: jest.fn().mockResolvedValue(mockUserId),
      getUserId: jest.fn().mockResolvedValue(mockUserId),
      getUserDisplayName: jest.fn().mockResolvedValue('User One'),
    };

    const mockRoomService = {
      getRoomById: jest.fn().mockResolvedValue(mockRoom),
      validateParticipant: jest.fn().mockResolvedValue({
        userId: mockUserId,
        displayName: 'User One',
      }),
      leaveRoom: jest.fn().mockResolvedValue(mockRoom),
    };

    const mockMessageService = {
      sendMessage: jest.fn().mockResolvedValue(mockMessage),
      deleteMessage: jest.fn().mockResolvedValue({ messageId: 'msg-123', deleted: true }),
      addReaction: jest.fn().mockResolvedValue({ type: ReactionType.LIKE, count: 1 }),
      removeReaction: jest.fn().mockResolvedValue({ type: ReactionType.LIKE, count: 0 }),
    };

    const mockRedis = {
      on: jest.fn(),
      subscribe: jest.fn(),
      publish: jest.fn(),
      duplicate: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: SessionService, useValue: mockSessionService },
        { provide: RoomService, useValue: mockRoomService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: REDIS_PUBLISHER, useValue: mockRedis },
        { provide: REDIS_SUBSCRIBER, useValue: mockRedis },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    sessionService = module.get(SessionService);
    roomService = module.get(RoomService);
    messageService = module.get(MessageService);

    // Set the server
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should authenticate socket with valid session', async () => {
      await gateway.handleConnection(mockSocket as Socket);

      expect(sessionService.getOrCreateUserId).toHaveBeenCalledWith(mockSessionId);
      expect(mockSocket.data?.userId).toBe(mockUserId);
    });

    it('should disconnect socket without session ID', async () => {
      const socketWithoutAuth: Partial<Socket> = {
        ...mockSocket,
        handshake: {
          ...mockSocket.handshake,
          auth: {},
        } as any,
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(socketWithoutAuth as Socket);

      expect(socketWithoutAuth.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle socket disconnection', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId } } as Socket;

      await gateway.handleDisconnect(socket);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('handleJoinRoom', () => {
    it('should join room successfully', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { roomId: 'room-123' };

      await gateway.handleJoinRoom(payload, socket);

      expect(mockSocket.join).toHaveBeenCalledWith('room-123');
      expect(roomService.validateParticipant).toHaveBeenCalled();
    });

    it('should emit error for invalid room', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      roomService.validateParticipant.mockRejectedValue(new Error('Not in room'));

      await gateway.handleJoinRoom({ roomId: 'invalid-room' }, socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.any(Object));
    });

    it('should broadcast user_joined event to room', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { roomId: 'room-123' };

      await gateway.handleJoinRoom(payload, socket);

      expect(mockServer.to).toHaveBeenCalledWith('room-123');
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave room successfully', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { roomId: 'room-123' };

      await gateway.handleLeaveRoom(payload, socket);

      expect(mockSocket.leave).toHaveBeenCalledWith('room-123');
    });

    it('should broadcast user_left event to room', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { roomId: 'room-123' };

      await gateway.handleLeaveRoom(payload, socket);

      expect(mockServer.to).toHaveBeenCalledWith('room-123');
    });
  });

  describe('handleSendMessage', () => {
    it('should send message and broadcast to room', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = {
        roomId: 'room-123',
        content: 'Hello!',
        contentType: ContentType.TEXT,
      };

      await gateway.handleSendMessage(payload, socket);

      expect(messageService.sendMessage).toHaveBeenCalled();
      expect(mockServer.to).toHaveBeenCalledWith('room-123');
    });

    it('should sanitize message content (XSS protection)', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = {
        roomId: 'room-123',
        content: '<script>alert("xss")</script>Hello',
        contentType: ContentType.TEXT,
      };

      await gateway.handleSendMessage(payload, socket);

      // Message service should receive sanitized content
      expect(messageService.sendMessage).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          content: expect.not.stringContaining('<script>'),
        }),
      );
    });

    it('should emit error for unauthorized user', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      messageService.sendMessage.mockRejectedValue(new Error('Not authorized'));

      await gateway.handleSendMessage(
        { roomId: 'room-123', content: 'Hello!' },
        socket,
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing indicator to room', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { roomId: 'room-123', isTyping: true };

      await gateway.handleTyping(payload, socket);

      expect(mockSocket.to).toHaveBeenCalledWith('room-123');
    });

    it('should broadcast stop typing when isTyping is false', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { roomId: 'room-123', isTyping: false };

      await gateway.handleTyping(payload, socket);

      expect(mockSocket.to).toHaveBeenCalledWith('room-123');
    });
  });

  describe('handleAddReaction', () => {
    it('should add reaction and broadcast to room', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { messageId: 'msg-123', reactionType: ReactionType.LIKE };

      await gateway.handleAddReaction(payload, socket);

      expect(messageService.addReaction).toHaveBeenCalledWith(
        mockSessionId,
        'msg-123',
        ReactionType.LIKE,
      );
    });

    it('should handle type or reactionType in payload', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { messageId: 'msg-123', type: ReactionType.LOVE };

      await gateway.handleAddReaction(payload, socket);

      expect(messageService.addReaction).toHaveBeenCalledWith(
        mockSessionId,
        'msg-123',
        ReactionType.LOVE,
      );
    });
  });

  describe('handleRemoveReaction', () => {
    it('should remove reaction and broadcast to room', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { messageId: 'msg-123', reactionType: ReactionType.LIKE };

      await gateway.handleRemoveReaction(payload, socket);

      expect(messageService.removeReaction).toHaveBeenCalledWith(
        mockSessionId,
        'msg-123',
        ReactionType.LIKE,
      );
    });
  });

  describe('handleDeleteMessage', () => {
    it('should delete message and broadcast to room', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      const payload = { messageId: 'msg-123' };

      await gateway.handleDeleteMessage(payload, socket);

      expect(messageService.deleteMessage).toHaveBeenCalledWith(
        mockSessionId,
        'msg-123',
      );
    });

    it('should emit error for unauthorized deletion', async () => {
      const socket = { ...mockSocket, data: { userId: mockUserId, sessionId: mockSessionId } } as Socket;
      messageService.deleteMessage.mockRejectedValue(new Error('Unauthorized'));

      await gateway.handleDeleteMessage({ messageId: 'msg-123' }, socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });
});
