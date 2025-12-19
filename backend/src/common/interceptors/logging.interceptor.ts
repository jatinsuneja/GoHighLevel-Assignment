/**
 * @fileoverview Logging Interceptor
 * @description Logs incoming requests and outgoing responses with timing
 * @module common/interceptors/logging
 * 
 * Design Pattern: Interceptor Pattern
 * - Provides cross-cutting logging concerns
 * - Measures request/response timing for performance monitoring
 * - Useful for debugging and production monitoring
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Logging Interceptor
 * 
 * @description Logs details about each request and response:
 * - Request method, URL, and body (if present)
 * - Response time in milliseconds
 * - Session ID from headers (for tracking anonymous users)
 * 
 * @class LoggingInterceptor
 * @implements {NestInterceptor}
 * 
 * @example
 * // Log output:
 * // [Incoming] POST /api/v1/rooms/create - Session: abc123
 * // [Outgoing] POST /api/v1/rooms/create - 45ms
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  /**
   * Intercepts requests and logs timing information
   * 
   * @param {ExecutionContext} context - Execution context
   * @param {CallHandler} next - Call handler to proceed with the request
   * @returns {Observable<unknown>} Response observable with logging side effects
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;
    const sessionId = request.headers['x-session-id'] as string;
    const startTime = Date.now();

    // Log incoming request
    this.logIncomingRequest(method, url, sessionId, body);

    return next.handle().pipe(
      tap({
        next: () => {
          // Log successful response
          this.logOutgoingResponse(method, url, startTime);
        },
        error: (error: Error) => {
          // Log error response
          this.logErrorResponse(method, url, startTime, error);
        },
      }),
    );
  }

  /**
   * Logs details about the incoming request
   * 
   * @private
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {string} sessionId - Session identifier
   * @param {unknown} body - Request body
   */
  private logIncomingRequest(
    method: string,
    url: string,
    sessionId: string | undefined,
    body: unknown,
  ): void {
    const sessionInfo = sessionId ? ` - Session: ${sessionId.slice(0, 8)}...` : '';
    const bodyInfo = this.sanitizeBody(body);
    
    this.logger.log(
      `[Incoming] ${method} ${url}${sessionInfo}${bodyInfo}`,
    );
  }

  /**
   * Logs details about the successful outgoing response
   * 
   * @private
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {number} startTime - Request start timestamp
   */
  private logOutgoingResponse(
    method: string,
    url: string,
    startTime: number,
  ): void {
    const duration = Date.now() - startTime;
    this.logger.log(`[Outgoing] ${method} ${url} - ${duration}ms`);
  }

  /**
   * Logs details about error responses
   * 
   * @private
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {number} startTime - Request start timestamp
   * @param {Error} error - The error that occurred
   */
  private logErrorResponse(
    method: string,
    url: string,
    startTime: number,
    error: Error,
  ): void {
    const duration = Date.now() - startTime;
    this.logger.warn(
      `[Error] ${method} ${url} - ${duration}ms - ${error.message}`,
    );
  }

  /**
   * Sanitizes request body for logging
   * Removes sensitive fields and truncates large payloads
   * 
   * @private
   * @param {unknown} body - Request body
   * @returns {string} Sanitized body string for logging
   */
  private sanitizeBody(body: unknown): string {
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      return '';
    }

    const sanitized = { ...body } as Record<string, unknown>;
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Truncate large bodies
    const bodyString = JSON.stringify(sanitized);
    if (bodyString.length > 200) {
      return ` - Body: ${bodyString.slice(0, 200)}...`;
    }

    return ` - Body: ${bodyString}`;
  }
}
