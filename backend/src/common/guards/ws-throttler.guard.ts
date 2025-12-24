/**
 * @fileoverview WebSocket Throttler Guard
 * @description Rate limiting for WebSocket events
 * @module common/guards/ws-throttler
 */

import { CanActivate, ExecutionContext, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class WsThrottlerGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(WsThrottlerGuard.name);
  
  // Rate limit configuration per event type (initialized in onModuleInit)
  private limits: Record<string, { max: number; windowMs: number }>;

  // In-memory storage (use Redis in production for horizontal scaling)
  private readonly rateLimits: Map<string, RateLimitEntry> = new Map();
  
  // Blocked clients (exceeded rate limit)
  private readonly blockedClients: Map<string, number> = new Map();
  private blockDurationMs: number;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const windowMs = this.configService.get<number>('WS_RATE_LIMIT_WINDOW_MS', 10000);
    const joinWindowMs = this.configService.get<number>('WS_JOIN_RATE_LIMIT_WINDOW_MS', 60000);
    
    this.limits = {
      send_message: { 
        max: this.configService.get<number>('WS_MESSAGE_RATE_LIMIT', 25), 
        windowMs,
      },
      typing: { 
        max: this.configService.get<number>('WS_TYPING_RATE_LIMIT', 50), 
        windowMs,
      },
      add_reaction: { 
        max: this.configService.get<number>('WS_REACTION_RATE_LIMIT', 15), 
        windowMs,
      },
      remove_reaction: { 
        max: this.configService.get<number>('WS_REACTION_RATE_LIMIT', 15), 
        windowMs,
      },
      delete_message: { 
        max: this.configService.get<number>('WS_DELETE_RATE_LIMIT', 5), 
        windowMs,
      },
      join_room: { 
        max: this.configService.get<number>('WS_JOIN_RATE_LIMIT', 10), 
        windowMs: joinWindowMs,
      },
      leave_room: { 
        max: this.configService.get<number>('WS_JOIN_RATE_LIMIT', 10), 
        windowMs: joinWindowMs,
      },
      default: { 
        max: this.configService.get<number>('WS_DEFAULT_RATE_LIMIT', 100), 
        windowMs,
      },
    };
    
    this.blockDurationMs = this.configService.get<number>('WS_RATE_LIMIT_BLOCK_DURATION_MS', 10000);
  }

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
      this.blockedClients.set(sessionId, now + this.blockDurationMs);
      
      client.emit('error', {
        message: 'Too many requests. You have been temporarily rate limited.',
        type: 'RATE_LIMIT',
        retryAfter: this.blockDurationMs / 1000,
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
