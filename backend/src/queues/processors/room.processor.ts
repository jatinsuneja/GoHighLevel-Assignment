/**
 * @fileoverview Room Lifecycle Processor
 * @description BullMQ worker for room lifecycle management
 * @module queues/processors/room
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@config/redis.module';

/**
 * Job data types
 */
interface CloseRoomJobData {
  roomId: string;
  roomCode: string;
  reason: string;
}

/**
 * Room Lifecycle Processor
 * 
 * @description Handles background jobs for room lifecycle:
 * - Room closure
 * - Cache invalidation
 * - Resource cleanup
 * 
 * @class RoomLifecycleProcessor
 */
@Processor('room-lifecycle')
export class RoomLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(RoomLifecycleProcessor.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {
    super();
  }

  /**
   * Processes incoming jobs based on their name
   * 
   * @param {Job} job - BullMQ job to process
   * @returns {Promise<void>}
   */
  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case 'close-room':
        await this.handleCloseRoom(job as Job<CloseRoomJobData>);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Handles room closure
   * 
   * @description Invalidates room code and cleans up cache
   * 
   * @private
   * @param {Job<CloseRoomJobData>} job - Room closure job
   */
  private async handleCloseRoom(job: Job<CloseRoomJobData>): Promise<void> {
    const { roomId, roomCode, reason } = job.data;

    this.logger.log(`Closing room: ${roomId} (${roomCode}) - ${reason}`);

    // Invalidate room cache
    await this.redisClient.del(`room:code:${roomCode}`);
    await this.redisClient.del(`room:id:${roomId}`);
    await this.redisClient.del(`room:${roomId}:presence`);

    this.logger.log(`Room closed and cache invalidated: ${roomCode}`);
  }

  /**
   * Called when a job completes successfully
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.debug(`Job completed: ${job.name} (ID: ${job.id})`);
  }

  /**
   * Called when a job fails
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Job failed: ${job.name} (ID: ${job.id}) - ${error.message}`,
    );
  }
}
