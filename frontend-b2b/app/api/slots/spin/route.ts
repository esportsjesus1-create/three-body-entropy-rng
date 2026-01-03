/**
 * Slots Spin API Route
 * 
 * Executes a slot spin and returns the result.
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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { sessionId, clientSeed } = body;

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  const spinId = crypto.randomUUID();
  const reelPositions = [
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10),
  ];
  const timestamp = Date.now();

  return NextResponse.json(
    {
      spinId,
      sessionId,
      clientSeed: clientSeed || null,
      reelPositions,
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
      message: 'Use POST to execute a spin',
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
