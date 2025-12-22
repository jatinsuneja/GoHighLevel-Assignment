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

/**
 * History Module
 * 
 * @description Provides history functionality:
 * - Chat history retrieval
 * - Archive management
 * - Per-user history deletion
 */
@Module({
  imports: [RoomModule, MessageModule],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
