/**
 * @fileoverview Chat Gateway Module
 * @description Configures the WebSocket gateway module
 * @module gateways/chat-gateway
 */

import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { RoomModule } from '../modules/room/room.module';
import { MessageModule } from '../modules/message/message.module';

/**
 * Chat Gateway Module
 * 
 * @description Provides WebSocket gateway functionality:
 * - Real-time messaging
 * - Typing indicators
 * - Presence notifications
 */
@Module({
  imports: [
    forwardRef(() => RoomModule),
    forwardRef(() => MessageModule),
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatGatewayModule {}
