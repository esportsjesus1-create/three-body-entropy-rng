/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting functionality using Upstash Redis with sliding window algorithm.
 * Prevents API abuse and ensures fair resource allocation across users.
 * 
 * @module rate-limiting
 * @example
 * ```typescript
 * import { rateLimiter } from '@/middleware/rate-limiting';
 * 
 * export async function POST(req: Request) {
 *   const { success, remaining } = await rateLimiter(req);
 *   if (!success) {
 *     return NextResponse.json(
 *       { error: 'Too many requests' },
 *       { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
 *     );
 *   }
 *   // ... rest of handler
 * }
 * ```
 */

export { rateLimiter, createRateLimiter, DEFAULT_CONFIG, resetRateLimiterState } from './src/limiter';
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitHeaders,
  RateLimitErrorResponse,
} from './src/types';
