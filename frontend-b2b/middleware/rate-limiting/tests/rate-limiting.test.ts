/**
 * Rate Limiting Middleware Tests
 * 
 * Comprehensive tests for the rate limiting middleware.
 * Tests cover:
 * - Rate limit enforcement
 * - Limit reset after window
 * - Different IP addresses
 * - Remaining count accuracy
 * 
 * Note: These tests use mocked Upstash dependencies to test the middleware logic
 * without requiring actual Redis connections.
 */

import type { RateLimitConfig, RateLimitResult } from '../src/types';

const mockLimitFn = jest.fn<() => Promise<{ success: boolean; remaining: number; reset: number; limit: number }>>();
const mockFromEnvFn = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => mockFromEnvFn(),
  },
}));

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: mockLimitFn,
  })),
}));

import { rateLimiter, createRateLimiter, resetRateLimiterState, DEFAULT_CONFIG } from '../src/limiter';

function createMockRequest(headers: Record<string, string> = {}): Request {
  const headersObj = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    headersObj.set(key, value);
  });
  
  return {
    headers: headersObj,
  } as Request;
}

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimiterState();
    mockFromEnvFn.mockReturnValue({});
  });

  describe('rateLimiter', () => {
    it('should allow requests when under the limit', async () => {
      mockLimitFn.mockResolvedValue({
        success: true,
        remaining: 9,
        reset: Date.now() + 60000,
        limit: 10,
      });

      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await rateLimiter(req);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should block requests when limit is exceeded', async () => {
      mockLimitFn.mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
        limit: 10,
      });

      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await rateLimiter(req);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return correct remaining count', async () => {
      mockLimitFn.mockResolvedValue({
        success: true,
        remaining: 5,
        reset: Date.now() + 60000,
        limit: 10,
      });

      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await rateLimiter(req);

      expect(result.remaining).toBe(5);
      expect(result.limit).toBe(10);
    });

    it('should include reset timestamp', async () => {
      const resetTime = Date.now() + 60000;
      mockLimitFn.mockResolvedValue({
        success: true,
        remaining: 8,
        reset: resetTime,
        limit: 10,
      });

      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await rateLimiter(req);

      expect(result.reset).toBe(resetTime);
    });
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      mockLimitFn.mockResolvedValue({
        success: true,
        remaining: 9,
        reset: Date.now() + 60000,
        limit: 10,
      });

      const req = createMockRequest({ 'x-forwarded-for': '10.0.0.1, 192.168.1.1' });
      await rateLimiter(req);

      expect(mockLimitFn).toHaveBeenCalledWith('10.0.0.1');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', async () => {
      mockLimitFn.mockResolvedValue({
        success: true,
        remaining: 9,
        reset: Date.now() + 60000,
        limit: 10,
      });

      const req = createMockRequest({ 'x-real-ip': '172.16.0.1' });
      await rateLimiter(req);

      expect(mockLimitFn).toHaveBeenCalledWith('172.16.0.1');
    });

    it('should use "unknown" when no IP headers are present', async () => {
      mockLimitFn.mockResolvedValue({
        success: true,
        remaining: 9,
        reset: Date.now() + 60000,
        limit: 10,
      });

      const req = createMockRequest({});
      await rateLimiter(req);

      expect(mockLimitFn).toHaveBeenCalledWith('unknown');
    });

    it('should handle different IP addresses independently', async () => {
      mockLimitFn
        .mockResolvedValueOnce({
          success: true,
          remaining: 9,
          reset: Date.now() + 60000,
          limit: 10,
        })
        .mockResolvedValueOnce({
          success: true,
          remaining: 5,
          reset: Date.now() + 60000,
          limit: 10,
        });

      const req1 = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const req2 = createMockRequest({ 'x-forwarded-for': '192.168.1.2' });

      const result1 = await rateLimiter(req1);
      const result2 = await rateLimiter(req2);

      expect(mockLimitFn).toHaveBeenCalledWith('192.168.1.1');
      expect(mockLimitFn).toHaveBeenCalledWith('192.168.1.2');
      expect(result1.remaining).toBe(9);
      expect(result2.remaining).toBe(5);
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should enforce rate limit after max requests', async () => {
      mockLimitFn
        .mockResolvedValueOnce({ success: true, remaining: 1, reset: Date.now() + 60000, limit: 10 })
        .mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() + 60000, limit: 10 });

      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      
      const result1 = await rateLimiter(req);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(1);

      resetRateLimiterState();
      
      const result2 = await rateLimiter(req);
      expect(result2.success).toBe(false);
      expect(result2.remaining).toBe(0);
    });

    it('should allow requests after window reset', async () => {
      mockLimitFn
        .mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() + 60000, limit: 10 })
        .mockResolvedValueOnce({ success: true, remaining: 10, reset: Date.now() + 120000, limit: 10 });

      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      
      const result1 = await rateLimiter(req);
      expect(result1.success).toBe(false);

      resetRateLimiterState();
      
      const result2 = await rateLimiter(req);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(10);
    });
  });

  describe('createRateLimiter', () => {
    it('should create a custom rate limiter with specified config', async () => {
      mockLimitFn.mockResolvedValue({
        success: true,
        remaining: 4,
        reset: Date.now() + 60000,
        limit: 5,
      });

      const customConfig: RateLimitConfig = {
        maxRequests: 5,
        windowSeconds: 30,
        prefix: '@custom-prefix',
        analytics: false,
      };

      const customLimiter = createRateLimiter(customConfig);
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await customLimiter(req);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONFIG.maxRequests).toBe(10);
      expect(DEFAULT_CONFIG.windowSeconds).toBe(60);
      expect(DEFAULT_CONFIG.prefix).toBe('@three-body-entropy');
      expect(DEFAULT_CONFIG.analytics).toBe(true);
    });
  });

  describe('Remaining Count Accuracy', () => {
    it('should accurately track remaining requests', async () => {
      const remainingCounts = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
      
      for (let i = 0; i < remainingCounts.length; i++) {
        mockLimitFn.mockResolvedValueOnce({
          success: remainingCounts[i] > 0,
          remaining: remainingCounts[i],
          reset: Date.now() + 60000,
          limit: 10,
        });
      }

      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      
      for (let i = 0; i < remainingCounts.length; i++) {
        resetRateLimiterState();
        const result = await rateLimiter(req);
        expect(result.remaining).toBe(remainingCounts[i]);
      }
    });

    it('should return zero remaining when limit is reached', async () => {
      mockLimitFn.mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
        limit: 10,
      });

      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const result = await rateLimiter(req);

      expect(result.remaining).toBe(0);
      expect(result.success).toBe(false);
    });
  });
});
