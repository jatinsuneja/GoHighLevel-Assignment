/**
 * @fileoverview Redis Module Configuration
 * @description Configures Redis connection for caching and Pub/Sub
 * @module config/redis
 */

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis client injection token
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Redis publisher injection token (for Pub/Sub)
 */
export const REDIS_PUBLISHER = 'REDIS_PUBLISHER';

/**
 * Redis subscriber injection token (for Pub/Sub)
 */
export const REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';

const logger = new Logger('RedisModule');

/**
 * Create a Redis client with error handling
 */
function createRedisClient(configService: ConfigService, name: string): Redis {
  const client = new Redis({
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    password: configService.get<string>('REDIS_PASSWORD', '') || undefined,
    keyPrefix: name === 'main' ? 'anon-chat:' : undefined,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.warn(`Redis ${name}: Max retries reached, stopping reconnection attempts`);
        return null; // Stop retrying
      }
      // Exponential backoff with max 5 seconds
      const delay = Math.min(times * 500, 5000);
      logger.log(`Redis ${name}: Retry attempt ${times}, next retry in ${delay}ms`);
      return delay;
    },
    lazyConnect: true, // Don't connect immediately
  });

  client.on('error', (err) => {
    logger.error(`Redis ${name} error: ${err.message}`);
  });

  client.on('connect', () => {
    logger.log(`Redis ${name}: Connected successfully`);
  });

  client.on('close', () => {
    logger.warn(`Redis ${name}: Connection closed`);
  });

  // Attempt to connect, but don't fail if Redis is unavailable
  client.connect().catch((err) => {
    logger.warn(`Redis ${name}: Initial connection failed - ${err.message}. App will work without caching.`);
  });

  return client;
}

/**
 * Redis Module
 * 
 * @description Global module that provides Redis client instances:
 * - REDIS_CLIENT: For general caching operations
 * - REDIS_PUBLISHER: For publishing messages (Pub/Sub)
 * - REDIS_SUBSCRIBER: For subscribing to channels (Pub/Sub)
 */
@Global()
@Module({
  providers: [
    // Main Redis client for caching
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis => {
        return createRedisClient(configService, 'main');
      },
      inject: [ConfigService],
    },
    // Redis publisher for Pub/Sub
    {
      provide: REDIS_PUBLISHER,
      useFactory: (configService: ConfigService): Redis => {
        return createRedisClient(configService, 'publisher');
      },
      inject: [ConfigService],
    },
    // Redis subscriber for Pub/Sub
    {
      provide: REDIS_SUBSCRIBER,
      useFactory: (configService: ConfigService): Redis => {
        return createRedisClient(configService, 'subscriber');
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT, REDIS_PUBLISHER, REDIS_SUBSCRIBER],
})
export class RedisModule {}
