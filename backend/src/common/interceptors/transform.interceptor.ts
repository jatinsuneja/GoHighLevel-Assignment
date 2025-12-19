/**
 * @fileoverview Transform Interceptor
 * @description Transforms all successful responses into a standardized format
 * @module common/interceptors/transform
 * 
 * Design Pattern: Interceptor Pattern
 * - Intercepts outgoing responses before they are sent to the client
 * - Wraps the response data in a consistent structure
 * - Provides uniform API response format across all endpoints
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard success response structure
 * 
 * @interface SuccessResponse
 * @template T - Type of the response data
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * Transform Interceptor
 * 
 * @description Wraps all successful responses in a standardized format:
 * {
 *   "success": true,
 *   "data": { ... },
 *   "meta": {
 *     "timestamp": "2025-12-18T10:00:00.000Z"
 *   }
 * }
 * 
 * @class TransformInterceptor
 * @implements {NestInterceptor<T, SuccessResponse<T>>}
 * 
 * @example
 * // In main.ts
 * app.useGlobalInterceptors(new TransformInterceptor());
 * 
 * // Controller returns: { roomId: "123", roomCode: "ABC123" }
 * // Client receives:
 * {
 *   "success": true,
 *   "data": { "roomId": "123", "roomCode": "ABC123" },
 *   "meta": { "timestamp": "2025-12-18T10:00:00.000Z" }
 * }
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  /**
   * Intercepts the response and transforms it
   * 
   * @param {ExecutionContext} context - Execution context
   * @param {CallHandler<T>} next - Call handler to proceed with the request
   * @returns {Observable<SuccessResponse<T>>} Transformed response observable
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => this.transformResponse(data)),
    );
  }

  /**
   * Transforms the response data into standardized format
   * 
   * @private
   * @param {T} data - Original response data
   * @returns {SuccessResponse<T>} Transformed response
   */
  private transformResponse(data: T): SuccessResponse<T> {
    // If data already has the success structure, return as-is
    if (this.isAlreadyTransformed(data)) {
      return data as unknown as SuccessResponse<T>;
    }

    // Handle pagination metadata if present
    const meta = this.extractMeta(data);

    return {
      success: true,
      data: this.extractData(data),
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Checks if response is already in the transformed format
   * 
   * @private
   * @param {T} data - Response data to check
   * @returns {boolean} True if already transformed
   */
  private isAlreadyTransformed(data: T): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      'data' in data
    );
  }

  /**
   * Extracts metadata from paginated responses
   * 
   * @private
   * @param {T} data - Response data
   * @returns {Record<string, unknown>} Extracted metadata
   */
  private extractMeta(data: T): Record<string, unknown> {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      
      // Handle pagination metadata
      if ('pagination' in obj) {
        return { pagination: obj.pagination };
      }
      
      // Handle total count
      if ('total' in obj && 'items' in obj) {
        return { total: obj.total };
      }
    }
    
    return {};
  }

  /**
   * Extracts the actual data from the response
   * 
   * @private
   * @param {T} data - Response data
   * @returns {T} Extracted data
   */
  private extractData(data: T): T {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      
      // If it has 'items' property, extract it
      if ('items' in obj && Array.isArray(obj.items)) {
        return obj.items as unknown as T;
      }
    }
    
    return data;
  }
}
