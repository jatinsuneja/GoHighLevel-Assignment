/**
 * @fileoverview Redis WebSocket Adapter
 * @description Custom Socket.IO adapter with Redis for horizontal scaling
 * @module config/redis-io.adapter
 */

import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Redis WebSocket Adapter
 *
 * @description Extends the default Socket.IO adapter to use Redis Pub/Sub
 * for broadcasting events across multiple server instances.
 *
 * @class RedisIoAdapter
 * @extends {IoAdapter}
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  /**
   * Connects to Redis and initializes the adapter
   */
  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      const pubClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        lazyConnect: true,
      });

      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        this.logger.error(`Redis pub client error: ${err.message}`);
      });

      subClient.on('error', (err) => {
        this.logger.error(`Redis sub client error: ${err.message}`);
      });

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('✅ Redis adapter initialized - horizontal scaling enabled');
    } catch (error) {
      this.logger.error(`Redis adapter setup failed: ${(error as Error).message}`);
      this.logger.warn('⚠️ Falling back to in-memory adapter - single instance mode');
    }
  }

  /**
   * Creates the Socket.IO server with Redis adapter
   */
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}

