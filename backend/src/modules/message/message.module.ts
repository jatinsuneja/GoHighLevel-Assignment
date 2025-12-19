/**
 * @fileoverview Message Module
 * @description Configures the message feature module
 * @module modules/message
 */

import { Module } from '@nestjs/common';

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
@Module({})
export class MessageModule {}
