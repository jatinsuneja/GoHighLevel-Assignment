/**
 * @fileoverview WebSocket Throttler Guard
 * @description Rate limiting for WebSocket events
 * @module common/guards/ws-throttler
 */

import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

/**
 * In-memory rate limiter for WebSocket events
 * In production, this should use Redis for distributed rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * WebSocket Throttler Guard
 * 
 * @description Rate limits WebSocket events to prevent spam and abuse.
 * 
 * Configuration:
 * - MESSAGE_LIMIT: Max messages per window
 * - WINDOW_MS: Time window in milliseconds
 * - BLOCK_DURATION_MS: How long to block after limit exceeded
 * 
 * @class WsThrottlerGuard
 */
@Injectable()
export class WsThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(WsThrottlerGuard.name);
  
  // Rate limit configuration per event type
  private readonly limits: Record<string, { max: number; windowMs: number }> = {
    send_message: { max: 25, windowMs: 10000 }, // 25 messages per 10 seconds
    typing: { max: 50, windowMs: 10000 }, // 50 typing events per 10 seconds
    add_reaction: { max: 15, windowMs: 10000 }, // 15 reactions per 10 seconds
    remove_reaction: { max: 15, windowMs: 10000 },
    delete_message: { max: 5, windowMs: 10000 }, // 5 deletes per 10 seconds
    join_room: { max: 10, windowMs: 60000 }, // 10 joins per minute
    leave_room: { max: 10, windowMs: 60000 },
    default: { max: 100, windowMs: 10000 }, // Default: 100 events per 10 seconds
  };

  // In-memory storage (use Redis in production for horizontal scaling)
  private readonly rateLimits: Map<string, RateLimitEntry> = new Map();
  
  // Blocked clients (exceeded rate limit)
  private readonly blockedClients: Map<string, number> = new Map();
  private readonly BLOCK_DURATION_MS = 10000; // 10 second block

  /**
   * Check if the WebSocket event should be allowed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const eventName = context.switchToWs().getPattern();
    
    const clientId = client.id;
    const sessionId = client.data?.sessionId || clientId;
    
    // Check if client is blocked
    const blockedUntil = this.blockedClients.get(sessionId);
    if (blockedUntil && Date.now() < blockedUntil) {
      const remainingSeconds = Math.ceil((blockedUntil - Date.now()) / 1000);
      client.emit('error', {
        message: `Rate limit exceeded. Please wait ${remainingSeconds} seconds.`,
        type: 'RATE_LIMIT',
      });
      return false;
    } else if (blockedUntil) {
      // Unblock if time has passed
      this.blockedClients.delete(sessionId);
    }

    // Get limits for this event type
    const limit = this.limits[eventName] || this.limits.default;
    const key = `${sessionId}:${eventName}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = this.rateLimits.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + limit.windowMs };
      this.rateLimits.set(key, entry);
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > limit.max) {
      this.logger.warn(
        `Rate limit exceeded for session ${sessionId.slice(0, 8)}... on event ${eventName}`
      );
      
      // Block client
      this.blockedClients.set(sessionId, now + this.BLOCK_DURATION_MS);
      
      client.emit('error', {
        message: 'Too many requests. You have been temporarily rate limited.',
        type: 'RATE_LIMIT',
        retryAfter: this.BLOCK_DURATION_MS / 1000,
      });
      
      return false;
    }

    return true;
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean rate limit entries
    for (const [key, entry] of this.rateLimits) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key);
      }
    }
    
    // Clean blocked clients
    for (const [key, blockedUntil] of this.blockedClients) {
      if (now > blockedUntil) {
        this.blockedClients.delete(key);
      }
    }
  }
}
