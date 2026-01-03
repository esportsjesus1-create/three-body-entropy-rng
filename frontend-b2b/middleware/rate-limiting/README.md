# Rate Limiting Middleware

Rate limiting middleware for the Three-Body Entropy RNG system using Upstash Redis with sliding window algorithm.

## Overview

This middleware prevents API abuse and ensures fair resource allocation across users by limiting the number of requests per IP address within a time window.

## Features

- Sliding window rate limiting algorithm
- Redis-backed for distributed environments
- Configurable limits and time windows
- IP address extraction from proxy headers
- Analytics tracking support

## Installation

The middleware requires the following dependencies (already installed in frontend-b2b):

```bash
npm install @upstash/ratelimit @upstash/redis
```

## Configuration

Set the following environment variables for Upstash Redis:

```env
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

## Usage

### Basic Usage

```typescript
import { rateLimiter } from '@/middleware/rate-limiting';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { success, remaining } = await rateLimiter(req);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { 
        status: 429, 
        headers: { 'X-RateLimit-Remaining': remaining.toString() } 
      }
    );
  }

  // ... rest of handler
}
```

### Custom Configuration

```typescript
import { createRateLimiter } from '@/middleware/rate-limiting';

const strictLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 60,
  prefix: '@three-body-entropy/strict',
  analytics: true,
});

export async function POST(req: Request) {
  const { success, remaining } = await strictLimiter(req);
  // ...
}
```

## Default Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| maxRequests | 10 | Maximum requests per window |
| windowSeconds | 60 | Time window in seconds (1 minute) |
| prefix | @three-body-entropy | Redis key prefix |
| analytics | true | Enable Upstash analytics |

## Response Headers

The middleware adds the following headers to responses:

| Header | Description |
|--------|-------------|
| X-RateLimit-Remaining | Number of requests remaining in the current window |
| X-RateLimit-Limit | Maximum requests allowed (optional) |
| X-RateLimit-Reset | Unix timestamp when the rate limit resets (optional) |

## IP Address Extraction

The middleware extracts the client IP address in the following order:

1. `x-forwarded-for` header (first IP in the list)
2. `x-real-ip` header
3. Falls back to "unknown" if no headers are present

## API Reference

### `rateLimiter(req: Request, config?: RateLimitConfig): Promise<RateLimitResult>`

Main rate limiter function.

**Parameters:**
- `req` - The incoming HTTP request
- `config` - Optional rate limit configuration

**Returns:**
- `success` - Whether the request is allowed
- `remaining` - Number of requests remaining
- `reset` - Unix timestamp when the limit resets
- `limit` - Maximum requests allowed

### `createRateLimiter(config: RateLimitConfig): (req: Request) => Promise<RateLimitResult>`

Creates a custom rate limiter with specific configuration.

### `resetRateLimiterState(): void`

Resets the rate limiter state. Used for testing purposes only.

## Types

```typescript
interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  prefix: string;
  analytics: boolean;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset?: number;
  limit?: number;
}
```

## Testing

Test files are provided in the `tests/` directory but require Jest to be configured in the project. The frontend-b2b project does not currently have Jest set up, so tests are excluded from TypeScript compilation.

To run the tests when Jest is configured:

```bash
npm test
```

To set up Jest for this project, you would need to:

1. Install Jest and related dependencies:
   ```bash
   npm install --save-dev jest @types/jest ts-jest
   ```

2. Create a `jest.config.js` file

3. Add a test script to `package.json`

The tests mock the Upstash dependencies to verify middleware logic without requiring actual Redis connections.

## License

MIT
