/**
 * Rate Limiting Types
 * 
 * Type definitions for the rate limiting middleware.
 * 
 * @module rate-limiting/types
 */

/**
 * Configuration options for the rate limiter.
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds (e.g., 60 for 1 minute) */
  windowSeconds: number;
  /** Prefix for Redis keys to namespace rate limits */
  prefix: string;
  /** Whether to enable analytics tracking */
  analytics: boolean;
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Unix timestamp when the rate limit resets */
  reset?: number;
  /** Maximum requests allowed in the window */
  limit?: number;
}

/**
 * Headers to include in rate-limited responses.
 */
export interface RateLimitHeaders {
  /** Number of requests remaining */
  'X-RateLimit-Remaining': string;
  /** Maximum requests allowed */
  'X-RateLimit-Limit'?: string;
  /** Unix timestamp when the rate limit resets */
  'X-RateLimit-Reset'?: string;
}

/**
 * Error response for rate-limited requests.
 */
export interface RateLimitErrorResponse {
  /** Error message */
  error: string;
  /** HTTP status code */
  status: number;
  /** Number of seconds until the rate limit resets */
  retryAfter?: number;
}
