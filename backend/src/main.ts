/**
 * @fileoverview Application Entry Point
 * @description Bootstrap the NestJS application with all configurations
 * @module main
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { RedisIoAdapter } from './config/redis-io.adapter';

/**
 * Bootstrap the NestJS application
 * 
 * @description Initializes the application with:
 * - Global validation pipes for DTO validation
 * - Global exception filters for consistent error responses
 * - Global interceptors for response transformation and logging
 * - CORS configuration for frontend communication
 * - WebSocket adapter configuration
 * 
 * @returns {Promise<void>}
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get configuration service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:5173');
  const corsMaxAge = configService.get<number>('CORS_MAX_AGE', 86400);

  // Set global API prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS with specific origins
  app.enableCors({
    origin: corsOrigins.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'X-Request-Id'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: corsMaxAge,
  });

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for WebSocket compatibility
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // Apply global validation pipe
  // Automatically validates incoming DTOs using class-validator decorators
  app.useGlobalPipes(
    // Sanitization pipe - XSS protection (runs first)
    new SanitizePipe(),
    // Validation pipe - DTO validation (runs second)
    new ValidationPipe({
      whitelist: true,           // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error on non-whitelisted properties
      transform: true,            // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable type conversion
      },
    }),
  );

  // Apply global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Apply global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),     // Log request/response details
    new TransformInterceptor(),   // Transform responses to standard format
  );

  // Set up Redis WebSocket adapter for horizontal scaling
  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  // Cast needed due to version mismatch between @nestjs/platform-socket.io v10 and @nestjs/core v11
  app.useWebSocketAdapter(redisIoAdapter as any);

  // Start the application
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📡 WebSocket server ready on: ws://localhost:${port}`);
  logger.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
}

bootstrap();
