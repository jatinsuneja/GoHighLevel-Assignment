/**
 * @fileoverview Session Decorator
 * @description Custom decorator to extract session ID from request headers
 * @module common/decorators/session
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Session ID Parameter Decorator
 * 
 * @description Extracts the session ID from the 'x-session-id' header.
 * Used to identify anonymous users across requests.
 * 
 * @example
 * // In a controller method:
 * @Get('history')
 * async getHistory(@SessionId() sessionId: string) {
 *   return this.historyService.getHistory(sessionId);
 * }
 */
export const SessionId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers['x-session-id'] as string | undefined;
  },
);

/**
 * Session Required Guard Decorator
 * 
 * @description Validates that a session ID is present in the request.
 * Throws an UnauthorizedException if missing.
 * 
 * @example
 * // In a controller method:
 * @Get('history')
 * @RequireSession()
 * async getHistory(@SessionId() sessionId: string) {
 *   // sessionId is guaranteed to be present
 * }
 */
export const RequireSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const sessionId = request.headers['x-session-id'] as string;
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    return sessionId;
  },
);
