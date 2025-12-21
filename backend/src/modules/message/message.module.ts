/**
 * @fileoverview Message Module
 * @description Configures the message feature module
 * @module modules/message
 * 
 * Design Pattern: Module Pattern
 * - Encapsulates all message-related functionality
 * - Defines providers, controllers, and exports
 */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessageRepository } from './repositories/message.repository';
import { MessageService } from './services/message.service';
import { MessageController } from './controllers/message.controller';
import { RoomModule } from '../room/room.module';

/**
 * Message Module
 * 
 * @description Provides message functionality:
 * - Message schema registration with Mongoose
 * - Repository for data access
 * - Service for business logic
 * - Controller for API endpoints
 * - BullMQ queue for async persistence
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
    ]),
    BullModule.registerQueue({
      name: 'message-persistence',
    }),
    forwardRef(() => RoomModule),
  ],
  controllers: [MessageController],
  providers: [MessageRepository, MessageService],
  exports: [MessageService, MessageRepository],
})
export class MessageModule {}
