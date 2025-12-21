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
import { Logger, Inject } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { REDIS_PUBLISHER, REDIS_SUBSCRIBER } from '../config/redis.module';
import { SessionService } from '../modules/session/services/session.service';
import { RoomService } from '../modules/room/services/room.service';
import { MessageService } from '../modules/message/services/message.service';
import { ContentType, ReactionType } from '../modules/message/schemas/message.schema';

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
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject(REDIS_PUBLISHER)
    private readonly redisPub: Redis,
    @Inject(REDIS_SUBSCRIBER)
    private readonly redisSub: Redis,
    private readonly sessionService: SessionService,
    private readonly roomService: RoomService,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Initializes the WebSocket gateway with Redis adapter
   * 
   * @description Sets up Redis adapter for horizontal scaling.
   * All WebSocket events are broadcast across all server instances.
   * Falls back to in-memory adapter if Redis is unavailable.
   * 
   * @param {Server} server - Socket.io server instance
   */
  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway initialized');

    // Try to set up Redis adapter, fall back to in-memory if unavailable
    try {
      if (this.redisPub.status === 'ready' && this.redisSub.status === 'ready') {
        const pubClient = this.redisPub.duplicate();
        const subClient = this.redisSub.duplicate();

        server.adapter(createAdapter(pubClient, subClient));
        this.logger.log('Redis adapter configured for WebSocket scaling');
      } else {
        this.logger.warn('Redis not ready, using in-memory adapter (single instance only)');
      }
    } catch (error) {
      this.logger.warn(`Redis adapter setup failed: ${error.message}. Using in-memory adapter.`);
    }
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
