/**
 * @fileoverview UUID v7 Utility Functions
 * @description Provides UUID v7 generation and room code creation utilities
 * @module common/utils/uuid
 */

import { uuidv7 } from 'uuidv7';

/**
 * Generates a UUID v7 identifier
 * 
 * @description Creates a time-ordered UUID that is suitable for:
 * - Database primary keys with natural ordering
 * - Distributed system ID generation without coordination
 * 
 * @returns {string} UUID v7 in standard format (36 characters with hyphens)
 * 
 * @example
 * const id = generateId();
 * // Returns: "019123ab-cdef-7000-8000-000000000001"
 */
export function generateId(): string {
  return uuidv7();
}

/**
 * Validates if a string is a valid UUID v7 format
 * 
 * @param {string} id - The string to validate
 * @returns {boolean} True if the string is a valid UUID format
 * 
 * @example
 * isValidUUID("019123ab-cdef-7000-8000-000000000001"); // true
 * isValidUUID("invalid"); // false
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Extracts timestamp from UUID v7
 * 
 * @param {string} uuid - UUID v7 string
 * @returns {Date} The timestamp embedded in the UUID
 * 
 * @example
 * const date = extractTimestamp("019123ab-cdef-7000-8000-000000000001");
 * // Returns: Date object representing the creation time
 */
export function extractTimestamp(uuid: string): Date {
  const timestampHex = uuid.replace(/-/g, '').slice(0, 12);
  const timestamp = parseInt(timestampHex, 16);
  return new Date(timestamp);
}
