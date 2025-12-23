/**
 * @fileoverview Input Sanitization Pipe
 * @description Sanitizes string inputs to prevent XSS attacks
 * @module common/pipes/sanitize
 */

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import * as xss from 'xss';

/**
 * XSS sanitization options
 * Allows safe text while stripping dangerous HTML/scripts
 */
const xssOptions: xss.IFilterXSSOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoreTag: true, // Strip all tags not in whitelist
  stripIgnoreTagBody: ['script', 'style'], // Completely remove script/style tags
  css: false, // Disable CSS filtering (we don't allow any)
};

/**
 * Sanitize Pipe
 * 
 * @description Sanitizes incoming string values to prevent XSS attacks.
 * Can be applied to individual route parameters or globally.
 * 
 * @example
 * // Apply to specific parameter
 * @Body('content', SanitizePipe) content: string
 * 
 * @example
 * // Apply to entire body
 * @Body(SanitizePipe) dto: CreateMessageDto
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  /**
   * Transform and sanitize the input value
   * 
   * @param {any} value - Input value to sanitize
   * @param {ArgumentMetadata} metadata - Argument metadata
   * @returns {any} Sanitized value
   */
  transform(value: any, metadata: ArgumentMetadata): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Sanitize string values
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    // Recursively sanitize object properties
    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.sanitizeObject(value);
    }

    // Sanitize array elements
    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, metadata));
    }

    return value;
  }

  /**
   * Sanitize a single string value
   */
  private sanitizeString(value: string): string {
    // Apply XSS filtering
    let sanitized = xss.filterXSS(value, xssOptions);
    
    // Additional cleanup
    sanitized = sanitized
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:/gi, 'data-blocked:') // Block data: URLs
      .replace(/vbscript:/gi, '') // Remove vbscript: URLs
      .replace(/on\w+=/gi, '') // Remove inline event handlers
      .trim();

    return sanitized;
  }

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = Array.isArray(value)
          ? value.map((item) => 
              typeof item === 'string' ? this.sanitizeString(item) : 
              typeof item === 'object' ? this.sanitizeObject(item) : item
            )
          : this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
