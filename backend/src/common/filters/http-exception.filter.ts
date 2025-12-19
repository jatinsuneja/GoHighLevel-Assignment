/**
 * @fileoverview HTTP Exception Filter
 * @description Global exception filter for consistent error response formatting
 * @module common/filters/http-exception
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Standard error response structure
 * 
 * @interface ErrorResponse
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    path: string;
  };
}

/**
 * Global HTTP Exception Filter
 * 
 * @description Catches all HTTP exceptions and formats them into a
 * consistent response structure. Also handles non-HTTP exceptions
 * by converting them to Internal Server Error responses.
 * 
 * @class HttpExceptionFilter
 * @implements {ExceptionFilter}
 * 
 * @example
 * // In main.ts
 * app.useGlobalFilters(new HttpExceptionFilter());
 * 
 * // Error response format:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Validation failed",
 *     "details": [...],
 *     "timestamp": "2025-12-18T10:00:00.000Z",
 *     "path": "/api/v1/rooms/join"
 *   }
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Catches and processes exceptions
   * 
   * @param {unknown} exception - The thrown exception
   * @param {ArgumentsHost} host - Provides access to request/response objects
   * @returns {void}
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP status and error details
    const { status, code, message, details } = this.extractErrorInfo(exception);

    // Log the error for debugging
    this.logError(exception, request, status);

    // Build standardized error response
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Extracts error information from the exception
   * 
   * @private
   * @param {unknown} exception - The thrown exception
   * @returns {Object} Extracted error information
   */
  private extractErrorInfo(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle validation errors (class-validator)
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const response = exceptionResponse as Record<string, unknown>;
        return {
          status,
          code: this.getErrorCode(status),
          message: (response.message as string) || exception.message,
          details: response.errors || response.message,
        };
      }

      return {
        status,
        code: this.getErrorCode(status),
        message: exception.message,
      };
    }

    // Handle non-HTTP exceptions (unexpected errors)
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' 
        ? (exception as Error)?.message 
        : undefined,
    };
  }

  /**
   * Maps HTTP status codes to error codes
   * 
   * @private
   * @param {number} status - HTTP status code
   * @returns {string} Error code string
   */
  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Logs error details for debugging and monitoring
   * 
   * @private
   * @param {unknown} exception - The thrown exception
   * @param {Request} request - Express request object
   * @param {number} status - HTTP status code
   */
  private logError(exception: unknown, request: Request, status: number): void {
    const message = exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${message}`,
        stack,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} - ${message}`,
      );
    }
  }
}
