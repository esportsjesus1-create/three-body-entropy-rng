/**
 * Slots Init API Route
 * 
 * Initializes a new slot game session and returns a commitment.
 * Rate limited to 10 requests per minute per IP.
 */

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/middleware/rate-limiting';

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

  const sessionId = crypto.randomUUID();
  const commitment = crypto.randomUUID();
  const timestamp = Date.now();

  return NextResponse.json(
    {
      sessionId,
      commitment,
      timestamp,
    },
    {
      headers: { 'X-RateLimit-Remaining': remaining.toString() }
    }
  );
}

export async function GET(req: Request) {
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

  return NextResponse.json(
    { 
      message: 'Use POST to initialize a new slot session',
      rateLimit: {
        remaining,
        limit: 10,
        window: '1 minute'
      }
    },
    {
      headers: { 'X-RateLimit-Remaining': remaining.toString() }
    }
  );
}
