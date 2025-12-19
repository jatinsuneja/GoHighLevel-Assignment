/**
 * @fileoverview Application Entry Point
 * @description Bootstrap the NestJS application with all configurations
 * @module main
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

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

async function bootstrap() {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get configuration service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:5173',
  );

  // Set global API prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS with specific origins
  app.enableCors({
    origin: corsOrigins.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Start the application
  await app.listen(port);
  console.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  console.log(`📡 WebSocket server ready on: ws://localhost:${port}`);
  console.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
}
bootstrap();
