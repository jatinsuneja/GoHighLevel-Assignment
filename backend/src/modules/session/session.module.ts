/**
 * @fileoverview Session Module
 * @description Configures the session feature module
 * @module modules/session
 * 
 * Design Pattern: Module Pattern
 * - Encapsulates all session-related functionality
 * - Segregated from chat data as per requirements
 */

import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSession, UserSessionSchema } from './schemas/session.schema';
import { SessionService } from './services/session.service';

/**
 * Session Module
 * 
 * @description Provides session functionality:
 * - User session schema registration
 * - Session service for management
 * - Global export for use across all modules
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSession.name, schema: UserSessionSchema },
    ]),
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
