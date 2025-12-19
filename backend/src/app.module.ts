/**
 * @fileoverview Root Application Module
 * @description Central module that imports and configures all feature modules
 * @module AppModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Feature Modules
import { RoomModule } from './modules/room/room.module';
import { MessageModule } from './modules/message/message.module';
import { SessionModule } from './modules/session/session.module';
import { HistoryModule } from './modules/history/history.module';

// Health Controller
import { HealthController } from './health.controller';

/**
 * Root Application Module
 *
 * @description Configures the application with:
 * - Environment configuration via ConfigModule
 */
@Module({
  imports: [
    // Global configuration module
    // Loads environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Feature modules
    RoomModule,
    MessageModule,
    SessionModule,
    HistoryModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
