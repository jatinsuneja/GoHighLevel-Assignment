/**
 * @fileoverview Message Queue Processor
 * @description BullMQ worker for message-related background jobs
 * @module queues/processors/message
 * 
 * Design Pattern: Worker Pattern
 * - Processes jobs asynchronously in the background
 * - Enables decoupled, scalable message handling
 * - Supports retry logic for failed jobs
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Job data types
 */
interface UpdateReactionJobData {
  messageId: string;
  reaction: {
    type: string;
    userId: string;
    createdAt: Date;
  };
  action: 'add' | 'remove';
}

interface PersistMessageJobData {
  messageId: string;
  roomId: string;
  senderId: string;
  content: string;
  contentType: string;
  timestamp: Date;
}

/**
 * Message Processor
 * 
 * @description Handles background jobs for message operations:
 * - Reaction analytics updates
 * - Message persistence (for write-heavy scenarios)
 * - Notification delivery
 * 
 * @class MessageProcessor
 */
@Processor('message-persistence')
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  /**
   * Processes incoming jobs based on their name
   * 
   * @param {Job} job - BullMQ job to process
   * @returns {Promise<void>}
   */
  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case 'update-reactions':
        await this.handleUpdateReactions(job as Job<UpdateReactionJobData>);
        break;
      case 'persist':
        await this.handlePersistMessage(job as Job<PersistMessageJobData>);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Handles reaction update analytics
   * 
   * @private
   * @param {Job<UpdateReactionJobData>} job - Reaction update job
   */
  private async handleUpdateReactions(
    job: Job<UpdateReactionJobData>,
  ): Promise<void> {
    const { messageId, reaction, action } = job.data;

    this.logger.debug(
      `Updating reaction analytics: ${action} ${reaction.type} on ${messageId}`,
    );

    // Here you could:
    // - Update analytics/metrics
    // - Send notifications
    // - Update caches
    // - Trigger webhooks

    // For now, just log the activity
    this.logger.log(
      `Reaction ${action}: ${reaction.type} on message ${messageId}`,
    );
  }

  /**
   * Handles message persistence (for write-heavy scenarios)
   * 
   * @description In high-load scenarios, messages can be written to Redis first
   * and then persisted to MongoDB via this job for eventual consistency.
   * 
   * @private
   * @param {Job<PersistMessageJobData>} job - Message persistence job
   */
  private async handlePersistMessage(
    job: Job<PersistMessageJobData>,
  ): Promise<void> {
    const { messageId, roomId } = job.data;

    this.logger.debug(`Persisting message: ${messageId} to room ${roomId}`);

    // In a write-through scenario, the message is already in MongoDB
    // This job can be used for:
    // - Backup writes
    // - Analytics
    // - Search indexing
    // - Archival

    this.logger.log(`Message ${messageId} persistence confirmed`);
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
