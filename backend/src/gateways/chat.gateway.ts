/**
 * @fileoverview Chat WebSocket Gateway
 * @description Real-time communication gateway using Socket.io with Redis adapter
 * @module gateways/chat
 * 
 * Design Pattern: Gateway Pattern
 * - Handles WebSocket connections and events
 * - Uses Redis Pub/Sub for cross-instance communication
 * - Enables horizontal scaling of WebSocket servers
 * 
 * Observer Pattern:
 * - Clients subscribe to room events
 * - Server broadcasts events to all subscribers
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../modules/session/services/session.service';
import { RoomService } from '../modules/room/services/room.service';
import { MessageService } from '../modules/message/services/message.service';
import { ContentType, ReactionType } from '../modules/message/schemas/message.schema';
import { WsThrottlerGuard } from '../common/guards/ws-throttler.guard';
import * as xss from 'xss';

/**
 * WebSocket event payloads
 */
interface JoinRoomPayload {
  roomId: string;
}

interface LeaveRoomPayload {
  roomId: string;
}

interface SendMessagePayload {
  roomId: string;
  content: string;
  contentType?: ContentType;
}

interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

interface ReactionPayload {
  messageId: string;
  type?: ReactionType;
  reactionType?: ReactionType;  // Frontend sends this
}

interface DeleteMessagePayload {
  messageId: string;
}

/**
 * Chat Gateway
 * 
 * @description WebSocket gateway for real-time chat features:
 * 
 * Client → Server Events:
 * - join_room: Join a chat room
 * - leave_room: Leave a chat room
 * - send_message: Send a message
 * - typing: Typing indicator
 * - add_reaction: Add reaction to message
 * - remove_reaction: Remove reaction from message
 * - delete_message: Delete a message
 * 
 * Server → Client Events:
 * - new_message: New message received
 * - user_typing: Typing indicator update
 * - message_deleted: Message was deleted
 * - reaction_updated: Reaction was updated
 * - user_joined: User joined the room
 * - user_left: User left the room
 * - room_closed: Room was closed
 * - error: Error occurred
 * 
 * @class ChatGateway
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  
  // Config values
  private defaultMessageLimit: number;

  constructor(
    private readonly sessionService: SessionService,
    private readonly roomService: RoomService,
    private readonly messageService: MessageService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.defaultMessageLimit = this.configService.get<number>('DEFAULT_MESSAGE_LIMIT', 50);
  }

  /**
   * Initializes the WebSocket gateway
   * 
   * @description Redis adapter is configured in main.ts via RedisIoAdapter
   * for horizontal scaling support.
   * 
   * @param {Server} _server - Socket.io server instance (unused - adapter configured in main.ts)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  afterInit(_server: Server): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Handles new WebSocket connections
   * 
   * @description Authenticates the connection using session ID from handshake.
   * Registers the socket with the session service.
   * 
   * @param {Socket} client - Connected socket
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const sessionId = this.extractSessionId(client);

      if (!sessionId) {
        this.logger.warn(`Connection rejected: No session ID - ${client.id}`);
        client.emit('error', { message: 'Session ID required' });
        client.disconnect();
        return;
      }

      // Register socket with session
      await this.sessionService.connectSocket(sessionId, client.id);

      // Store session ID in socket data for later use
      client.data.sessionId = sessionId;

      this.logger.log(`Client connected: ${client.id} (Session: ${sessionId.slice(0, 8)}...)`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  /**
   * Handles WebSocket disconnections
   * 
   * @description Cleans up session state and notifies room participants.
   * 
   * @param {Socket} client - Disconnected socket
   */
  async handleDisconnect(client: Socket): Promise<void> {
    try {
      const sessionId = await this.sessionService.disconnectSocket(client.id);

      if (sessionId) {
        this.logger.log(`Client disconnected: ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Handles room join requests
   * 
   * @description Joins the socket to a room and notifies other participants.
   * 
   * @event join_room
   * @param {JoinRoomPayload} payload - Room to join
   * @param {Socket} client - Connected socket
   */
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const sessionId = client.data.sessionId || this.extractSessionId(client);
      const { roomId } = payload;

      this.logger.debug(`Join room: ${roomId} by ${sessionId}`);

      if (!sessionId) {
        client.emit('error', { message: 'Session ID required' });
        return;
      }

      // Validate user is in room
      const room = await this.roomService.getRoomById(roomId);
      const userId = await this.sessionService.getUserId(sessionId);
      
      if (!userId) {
        // Try to get userId directly from room participants (fallback)
        this.logger.warn(`No userId found in session ${sessionId}, checking room participants`);
        client.emit('error', { message: 'Session not found. Please refresh the page.' });
        return;
      }

      const participant = room.participants.find((p) => p.userId === userId);
      if (!participant) {
        client.emit('error', { message: 'Not a participant of this room' });
        return;
      }

      // Join socket room
      await client.join(roomId);

      // Update session current room
      await this.sessionService.setCurrentRoom(sessionId, roomId);

      // Get recent messages for the room
      const recentMessages = await this.messageService.getMessages(sessionId, roomId, {
        limit: this.defaultMessageLimit,
      });

      // Map participants for response
      const activeParticipants = room.participants
        .filter((p) => p.isActive)
        .map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          isActive: true,
          isOnline: true,
          joinedAt: p.joinedAt.toISOString(),
          lastSeenAt: new Date().toISOString(),
        }));

      // Emit room_joined to the joining client
      client.emit('room_joined', {
        roomId,
        userId,
        roomCode: room.roomCode,
        participants: activeParticipants,
        recentMessages: recentMessages.messages,
      });

      // Broadcast updated participants list to ALL clients in the room (including the joiner)
      // This ensures everyone has the latest participant list
      this.server.to(roomId).emit('participants_updated', {
        roomId,
        participants: activeParticipants,
      });

      // Also emit user_joined for notification purposes
      client.to(roomId).emit('user_joined', {
        userId,
        displayName: participant.displayName,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User joined room: ${roomId}`);
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handles room leave requests
   * 
   * @event leave_room
   * @param {LeaveRoomPayload} payload - Room to leave
   * @param {Socket} client - Connected socket
   */
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() payload: LeaveRoomPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const sessionId = client.data.sessionId;
      const { roomId } = payload;

      this.logger.debug(`Leave room: ${roomId} by ${sessionId}`);

      // Get user info before leaving
      const userId = await this.sessionService.getUserId(sessionId);
      
      // Get room to find user's display name from participants BEFORE leaving
      const roomBefore = await this.roomService.getRoomById(roomId);
      const leavingParticipant = roomBefore?.participants.find((p) => p.userId === userId);
      const displayName = leavingParticipant?.displayName || 'Unknown';

      // Update session
      await this.sessionService.setCurrentRoom(sessionId, null);

      // Call room service to mark participant as inactive in database
      const updatedRoom = await this.roomService.leaveRoom(sessionId, roomId);

      // Get updated room participants (only active ones)
      const activeParticipants = updatedRoom.participants
        .filter((p) => p.isActive)
        .map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          isActive: true,
          isOnline: true,
          joinedAt: p.joinedAt.toISOString(),
          lastSeenAt: new Date().toISOString(),
        }));

      // Notify other participants about who left (before leaving socket room)
      client.to(roomId).emit('user_left', {
        userId,
        displayName,
        timestamp: new Date().toISOString(),
      });

      // Broadcast updated participants list to remaining clients
      this.server.to(roomId).emit('participants_updated', {
        roomId,
        participants: activeParticipants,
      });

      // Leave socket room AFTER broadcasting
      await client.leave(roomId);

      this.logger.log(`User ${displayName} left room: ${roomId}`);
    } catch (error) {
      this.logger.error(`Leave room error: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handles incoming messages
   * 
   * @description Persists the message and broadcasts to room participants.
   * 
   * @event send_message
   * @param {SendMessagePayload} payload - Message data
   * @param {Socket} client - Connected socket
   */
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const sessionId = client.data.sessionId;
      const { roomId, content, contentType } = payload;

      // Sanitize message content to prevent XSS
      const sanitizedContent = xss.filterXSS(content || '', {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style'],
      });

      if (!sanitizedContent.trim()) {
        client.emit('error', { message: 'Message content is required' });
        return;
      }

      this.logger.debug(`Message to room: ${roomId}`);

      // Send message via service
      const message = await this.messageService.sendMessage(sessionId, {
        roomId,
        content: sanitizedContent,
        contentType,
      });

      // Broadcast to room (including sender for confirmation)
      this.server.to(roomId).emit('new_message', message);

      this.logger.debug(`Message broadcast to room: ${roomId}`);
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handles typing indicator updates
   * 
   * @description Broadcasts typing status to other room participants.
   * Uses throttling on client side (recommended: max 1 per 500ms).
   * 
   * @event typing
   * @param {TypingPayload} payload - Typing status
   * @param {Socket} client - Connected socket
   */
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() payload: TypingPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const sessionId = client.data.sessionId;
      const { roomId, isTyping } = payload;

      const userId = await this.sessionService.getUserId(sessionId);

      // Get user display name
      const room = await this.roomService.getRoomById(roomId);
      const participant = room.participants.find((p) => p.userId === userId);

      // Broadcast to others in room (not sender)
      client.to(roomId).emit('user_typing', {
        userId,
        displayName: participant?.displayName || 'Unknown',
        isTyping,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Typing indicator error: ${error.message}`);
    }
  }

  /**
   * Handles message deletion
   * 
   * @event delete_message
   * @param {DeleteMessagePayload} payload - Message to delete
   * @param {Socket} client - Connected socket
   */
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() payload: DeleteMessagePayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const sessionId = client.data.sessionId;
      const { messageId } = payload;

      this.logger.debug(`Delete message: ${messageId}`);

      // Delete message via service
      const message = await this.messageService.deleteMessage(sessionId, messageId);

      // Broadcast to room
      this.server.to(message.roomId).emit('message_deleted', {
        messageId: message.messageId,
        deletedBy: message.senderName,
        placeholder: message.deletionPlaceholder,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Delete message error: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handles adding reactions
   * 
   * @event add_reaction
   * @param {ReactionPayload} payload - Reaction data
   * @param {Socket} client - Connected socket
   */
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @MessageBody() payload: ReactionPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const sessionId = client.data.sessionId;
      const { messageId } = payload;
      const type = payload.type || payload.reactionType;

      if (!type) {
        client.emit('error', { message: 'Reaction type is required' });
        return;
      }

      this.logger.debug(`Add reaction ${type} to message: ${messageId}`);

      // Add reaction via service
      const message = await this.messageService.addReaction(sessionId, messageId, type);

      // Broadcast to room
      this.server.to(message.roomId).emit('reaction_updated', {
        messageId: message.messageId,
        reactions: message.reactions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Add reaction error: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handles removing reactions
   * 
   * @event remove_reaction
   * @param {ReactionPayload} payload - Reaction data
   * @param {Socket} client - Connected socket
   */
  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @MessageBody() payload: ReactionPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const sessionId = client.data.sessionId;
      const { messageId } = payload;
      const type = payload.type || payload.reactionType;

      if (!type) {
        client.emit('error', { message: 'Reaction type is required' });
        return;
      }

      this.logger.debug(`Remove reaction ${type} from message: ${messageId}`);

      // Remove reaction via service
      const message = await this.messageService.removeReaction(sessionId, messageId, type);

      // Broadcast to room
      this.server.to(message.roomId).emit('reaction_updated', {
        messageId: message.messageId,
        reactions: message.reactions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Remove reaction error: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Extracts session ID from socket handshake
   * 
   * @private
   * @param {Socket} client - Socket to extract from
   * @returns {string | null} Session ID or null
   */
  private extractSessionId(client: Socket): string | null {
    // Try auth object first
    if (client.handshake.auth?.sessionId) {
      return client.handshake.auth.sessionId;
    }

    // Try query parameters
    if (client.handshake.query?.sessionId) {
      return client.handshake.query.sessionId as string;
    }

    // Try headers
    if (client.handshake.headers?.['x-session-id']) {
      return client.handshake.headers['x-session-id'] as string;
    }

    return null;
  }

  /**
   * Broadcasts room closure to all participants
   * 
   * @description Called when both users have left the room
   * 
   * @param {string} roomId - Room that was closed
   * @param {string} reason - Reason for closure
   */
  async broadcastRoomClosed(roomId: string, reason: string): Promise<void> {
    this.server.to(roomId).emit('room_closed', {
      roomId,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}
