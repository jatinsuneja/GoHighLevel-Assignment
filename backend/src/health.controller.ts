/**
 * Health Controller
 * 
 * Provides health check endpoint for container orchestration
 * and load balancer health checks.
 */

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /**
   * Health check endpoint
   * Returns 200 OK if the service is running
   * 
   * @returns Health status object
   * 
   * @example
   * curl http://localhost:4000/health
   */
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
