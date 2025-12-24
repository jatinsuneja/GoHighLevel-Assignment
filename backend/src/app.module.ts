/**
 * @fileoverview Root Application Module
 * @description Central module that imports and configures all feature modules
 * @module AppModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Feature Modules
import { RoomModule } from './modules/room/room.module';
import { MessageModule } from './modules/message/message.module';
import { SessionModule } from './modules/session/session.module';
import { HistoryModule } from './modules/history/history.module';

// Chat Gateway Module
import { ChatGatewayModule } from './gateways/chat-gateway.module';

// Queue Module
import { QueueModule } from './queues/queue.module';

// Redis Module
import { RedisModule } from './config/redis.module';

// Health Controller
import { HealthController } from './health.controller';

// Security Guards
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

/**
 * Root Application Module
 *
 * @description Configures the application with:
 * - Environment configuration via ConfigModule
 * - MongoDB connection via MongooseModule
 * - Redis connection for caching and Pub/Sub
 * - BullMQ for job queue processing
 * - Feature modules for business logic
 * - WebSocket gateway for real-time communication
 */
@Module({
  imports: [
    // Global configuration module
    // Loads environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting with Throttler
    // Protects against brute force and DoS attacks
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: configService.get<number>('THROTTLE_SHORT_TTL_MS', 1000),
            limit: configService.get<number>('THROTTLE_SHORT_LIMIT', 10),
          },
          {
            name: 'medium',
            ttl: configService.get<number>('THROTTLE_MEDIUM_TTL_MS', 10000),
            limit: configService.get<number>('THROTTLE_MEDIUM_LIMIT', 50),
          },
          {
            name: 'long',
            ttl: configService.get<number>('THROTTLE_LONG_TTL_MS', 60000),
            limit: configService.get<number>('THROTTLE_LONG_LIMIT', 200),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // MongoDB connection with Mongoose
    // Uses async factory to inject ConfigService
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/anonymous-chat',
        ),
        dbName: configService.get<string>('MONGODB_DB_NAME', 'anonymous-chat'),
        // Connection options for production readiness
        retryWrites: true,
        w: 'majority',
      }),
      inject: [ConfigService],
    }),

    // BullMQ configuration for job queues
    // Uses Redis as the backend - will retry connection if Redis is unavailable
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const maxRetries = configService.get<number>('REDIS_MAX_RETRIES', 10);
        const retryDelay = configService.get<number>('REDIS_RETRY_DELAY_MS', 500);
        const maxRetryDelay = configService.get<number>('REDIS_MAX_RETRY_DELAY_MS', 5000);
        
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password:
              configService.get<string>('REDIS_PASSWORD', '') || undefined,
            maxRetriesPerRequest: null, // Disable retry limiting for workers
            enableReadyCheck: false, // Skip ready check for faster startup
            retryStrategy: (times: number) => {
              if (times > maxRetries) return null; // Stop after max retries
              return Math.min(times * retryDelay, maxRetryDelay);
            },
          },
          prefix: configService.get<string>('BULLMQ_PREFIX', 'anon-chat'),
        };
      },
      inject: [ConfigService],
    }),

    // Redis module for caching and Pub/Sub
    RedisModule,

    // Feature modules
    RoomModule,
    MessageModule,
    SessionModule,
    HistoryModule,

    // WebSocket gateway module
    ChatGatewayModule,

    // Background job processing module
    QueueModule,
  ],
  controllers: [HealthController],
  providers: [
    // Apply rate limiting globally to all HTTP routes
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
