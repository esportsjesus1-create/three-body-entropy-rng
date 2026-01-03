/**
 * Rate Limiting Implementation
 * 
 * Implements rate limiting using Upstash Redis with sliding window algorithm.
 * Prevents API abuse and ensures fair resource allocation across users.
 * 
 * @module rate-limiting/limiter
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { RateLimitConfig, RateLimitResult } from './types';

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowSeconds: 60,
  prefix: '@three-body-entropy',
  analytics: true,
};

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function initializeRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

function initializeRatelimit(config: RateLimitConfig = DEFAULT_CONFIG): Ratelimit {
  if (!ratelimit) {
    const redisClient = initializeRedis();
    ratelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowSeconds} s`),
      analytics: config.analytics,
      prefix: config.prefix,
    });
  }
  return ratelimit;
}

function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    return firstIp;
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Rate limiter middleware function.
 * 
 * Checks if the request should be allowed based on the client's IP address
 * and the configured rate limits.
 * 
 * @param req - The incoming HTTP request
 * @param config - Optional rate limit configuration
 * @returns Promise resolving to rate limit result with success status and remaining count
 * 
 * @example
 * ```typescript
 * const { success, remaining } = await rateLimiter(req);
 * if (!success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
 *   );
 * }
 * ```
 */
export async function rateLimiter(
  req: Request,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
  const limiter = initializeRatelimit(config);
  const identifier = getClientIdentifier(req);
  
  const { success, remaining, reset, limit } = await limiter.limit(identifier);
  
  return {
    success,
    remaining,
    reset,
    limit,
  };
}

/**
 * Creates a custom rate limiter with specific configuration.
 * 
 * @param config - Rate limit configuration
 * @returns A rate limiter function with the specified configuration
 * 
 * @example
 * ```typescript
 * const strictLimiter = createRateLimiter({
 *   maxRequests: 5,
 *   windowSeconds: 60,
 *   prefix: '@three-body-entropy/strict',
 *   analytics: true,
 * });
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  const redisClient = initializeRedis();
  const customLimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowSeconds} s`),
    analytics: config.analytics,
    prefix: config.prefix,
  });

  return async (req: Request): Promise<RateLimitResult> => {
    const identifier = getClientIdentifier(req);
    const { success, remaining, reset, limit } = await customLimiter.limit(identifier);
    
    return {
      success,
      remaining,
      reset,
      limit,
    };
  };
}

/**
 * Resets the rate limit state for testing purposes.
 * Should only be used in test environments.
 */
export function resetRateLimiterState(): void {
  redis = null;
  ratelimit = null;
}

export { DEFAULT_CONFIG };
