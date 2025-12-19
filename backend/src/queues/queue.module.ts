/**
 * @fileoverview Queue Module
 * @description Configures BullMQ queues and processors
 * @module queues
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

/**
 * Queue Module
 * 
 * @description Configures background job processing:
 * - Message persistence queue
 * - Room lifecycle queue
 * - Processors for each queue type
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'message-persistence' },
      { name: 'room-lifecycle' },
    ),
  ],
  providers: [],
  exports: [],
})
export class QueueModule {}
