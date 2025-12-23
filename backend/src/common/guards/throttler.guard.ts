/**
 * @fileoverview Custom Throttler Guard
 * @description Extended throttler guard with custom error handling
 * @module common/guards/throttler
 */

import { ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom Throttler Guard
 * 
 * @description Extends the default throttler guard to provide:
 * - Custom error messages
 * - Skip throttling for health checks
 * - WebSocket support
 * 
 * @class CustomThrottlerGuard
 * @extends ThrottlerGuard
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Check if the request should be throttled
   * 
   * @param {ExecutionContext} context - Execution context
   * @returns {Promise<boolean>} Whether the request is allowed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for health checks
    const request = context.switchToHttp().getRequest();
    if (request?.url?.includes('/health')) {
      return true;
    }

    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please wait before trying again.',
            error: 'Rate Limit Exceeded',
            retryAfter: this.getRetryAfter(context),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  /**
   * Get the retry-after time in seconds
   */
  private getRetryAfter(context: ExecutionContext): number {
    // Default to 60 seconds
    return 60;
  }

  /**
   * Get the tracker key for the request
   * Uses IP address as the default tracker
   */
  protected getTracker(req: Record<string, any>): Promise<string> {
    // Use X-Forwarded-For header if behind a proxy, otherwise use IP
    const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.ip 
      || req.connection?.remoteAddress 
      || 'unknown';
    return Promise.resolve(ip);
  }
}
