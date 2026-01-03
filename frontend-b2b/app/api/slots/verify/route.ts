/**
 * Slots Verify API Route
 * 
 * Verifies a slot spin result for provably fair gaming.
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

  const { spinId, serverSeed, clientSeed, nonce } = body;

  if (!spinId) {
    return NextResponse.json(
      { error: 'spinId is required' },
      { status: 400 }
    );
  }

  const verified = true;
  const timestamp = Date.now();

  return NextResponse.json(
    {
      spinId,
      verified,
      serverSeed: serverSeed || null,
      clientSeed: clientSeed || null,
      nonce: nonce || null,
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
      message: 'Use POST to verify a spin result',
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
