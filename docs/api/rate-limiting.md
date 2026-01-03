# Rate Limiting API Documentation

This document describes the rate limiting implementation for the Three-Body Entropy RNG API endpoints.

## Overview

All API endpoints are protected by rate limiting to prevent abuse and ensure fair resource allocation across users. The rate limiting is implemented using Upstash Redis with a sliding window algorithm.

## Rate Limit Values

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| `/api/slots/init` | 10 requests | 1 minute | Initialize slot session |
| `/api/slots/spin` | 10 requests | 1 minute | Execute slot spin |
| `/api/slots/verify` | 10 requests | 1 minute | Verify spin result |

## Response Headers

All API responses include rate limit information in the headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Remaining` | Number of requests remaining in the current window |

## Handling 429 Responses

When the rate limit is exceeded, the API returns a `429 Too Many Requests` response:

```json
{
  "error": "Too many requests"
}
```

### Response Headers for 429

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Remaining: 0
Content-Type: application/json
```

## Best Practices for Clients

### 1. Implement Exponential Backoff

When receiving a 429 response, implement exponential backoff:

```typescript
async function makeRequestWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}
```

### 2. Monitor Rate Limit Headers

Check the `X-RateLimit-Remaining` header to proactively slow down requests:

```typescript
async function makeRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '10');
  
  if (remaining < 3) {
    console.warn('Rate limit nearly exhausted, slowing down requests');
  }
  
  return response;
}
```

### 3. Batch Requests When Possible

Instead of making multiple individual requests, batch operations when the API supports it.

### 4. Cache Responses

Cache responses locally to reduce the number of API calls:

```typescript
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

async function cachedFetch(url: string) {
  const cached = cache.get(url);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  cache.set(url, { data, timestamp: Date.now() });
  
  return data;
}
```

## Rate Limit Reset

The rate limit window resets every 60 seconds using a sliding window algorithm. This means that requests are counted within a rolling 60-second window, providing smoother rate limiting compared to fixed windows.

## IP Address Detection

The rate limiter identifies clients by their IP address, extracted in the following order:

1. `X-Forwarded-For` header (first IP in the list)
2. `X-Real-IP` header
3. Falls back to "unknown" if no headers are present

When behind a proxy or load balancer, ensure these headers are properly configured.

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Request successful |
| 400 | Bad request (invalid parameters) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Example Requests

### Initialize Session

```bash
curl -X POST https://api.example.com/api/slots/init \
  -H "Content-Type: application/json"
```

### Execute Spin

```bash
curl -X POST https://api.example.com/api/slots/spin \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "uuid", "clientSeed": "optional-seed"}'
```

### Verify Result

```bash
curl -X POST https://api.example.com/api/slots/verify \
  -H "Content-Type: application/json" \
  -d '{"spinId": "uuid", "serverSeed": "seed", "clientSeed": "seed", "nonce": 1}'
```

## Configuration

The rate limiting is configured with the following defaults:

```typescript
const DEFAULT_CONFIG = {
  maxRequests: 10,      // Maximum requests per window
  windowSeconds: 60,    // Time window in seconds
  prefix: '@three-body-entropy',  // Redis key prefix
  analytics: true,      // Enable Upstash analytics
};
```

## Environment Variables

The rate limiter requires the following environment variables:

```env
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

## Support

For rate limit increases or custom configurations, please contact the API support team.
