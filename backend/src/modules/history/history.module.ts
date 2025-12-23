/**
 * @fileoverview History Module
 * @description Configures the history feature module
 * @module modules/history
 * 
 * Design Pattern: Module Pattern
 * - Encapsulates all history-related functionality
 * - Aggregates data from Room and Message modules
 */

import { Module } from '@nestjs/common';
import { HistoryService } from './services/history.service';
import { HistoryController } from './controllers/history.controller';
import { RoomModule } from '../room/room.module';
import { MessageModule } from '../message/message.module';
import { SessionModule } from '../session/session.module';
import { RedisModule } from '../../config/redis.module';

/**
 * History Module
 * 
 * @description Provides history functionality:
 * - Chat history retrieval with last message preview
 * - Archive/unarchive management
 * - Per-user history deletion (soft delete)
 * - Message counts and unread indicators
 * 
 * @dependencies
 * - RoomModule: For room data and participant info
 * - MessageModule: For last message previews
 * - SessionModule: For user session and history tracking
 * - RedisModule: For caching frequently accessed history
 */
@Module({
  imports: [
    RoomModule,
    MessageModule,
    SessionModule,
    RedisModule,
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
