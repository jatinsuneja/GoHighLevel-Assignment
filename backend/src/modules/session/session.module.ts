/**
 * @fileoverview Session Module
 * @description Configures the session feature module
 * @module modules/session
 */

import { Module, Global } from '@nestjs/common';

/**
 * Session Module
 *
 * @description Provides session functionality:
 * - User session schema registration
 * - Session service for management
 * - Global export for use across all modules
 */
@Global()
@Module({})
export class SessionModule {}
