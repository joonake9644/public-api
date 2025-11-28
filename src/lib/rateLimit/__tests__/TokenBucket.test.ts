/**
 * TokenBucketRateLimiter Unit Tests
 *
 * Tests all rate limiting functionality including:
 * - Token consumption and refill
 * - Tier-based rate limits
 * - Violation tracking
 * - Statistics
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenBucketRateLimiter } from '../TokenBucket';
import type { RateLimitTier } from '@/src/lib/types/rateLimit';
import { RATE_LIMIT_POLICIES } from '@/src/lib/types/rateLimit';

describe('TokenBucketRateLimiter', () => {
  let rateLimiter: TokenBucketRateLimiter;

  beforeEach(() => {
    // Get singleton instance
    rateLimiter = TokenBucketRateLimiter.getInstance();

    // Reset all buckets and stats before each test
    rateLimiter.resetAll();
    rateLimiter.resetStats();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = TokenBucketRateLimiter.getInstance();
      const instance2 = TokenBucketRateLimiter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkLimit - Basic Rate Limiting', () => {
    it('should allow first request', () => {
      const result = rateLimiter.checkLimit('192.168.1.1', 'anonymous');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
      expect(result.limit).toBe(100);
      expect(result).toHaveProperty('reset');
      expect(result.retryAfter).toBeUndefined();
    });

    it('should consume tokens on each request', () => {
      const ip = '192.168.1.2';

      const result1 = rateLimiter.checkLimit(ip, 'anonymous');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(99);

      const result2 = rateLimiter.checkLimit(ip, 'anonymous');
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(98);

      const result3 = rateLimiter.checkLimit(ip, 'anonymous');
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(97);
    });

    it('should block requests when limit exceeded', () => {
      const ip = '192.168.1.3';

      // Consume all tokens (100 requests)
      for (let i = 0; i < 100; i++) {
        const result = rateLimiter.checkLimit(ip, 'anonymous');
        expect(result.allowed).toBe(true);
      }

      // 101st request should be blocked
      const blocked = rateLimiter.checkLimit(ip, 'anonymous');
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfter).toBeGreaterThan(0);
      expect(blocked).toHaveProperty('reset');
    });

    it('should handle different identifiers independently', () => {
      const ip1 = '192.168.1.4';
      const ip2 = '192.168.1.5';

      rateLimiter.checkLimit(ip1, 'anonymous');
      rateLimiter.checkLimit(ip1, 'anonymous');

      const status1 = rateLimiter.getStatus(ip1, 'anonymous');
      const status2 = rateLimiter.getStatus(ip2, 'anonymous');

      expect(status1.remaining).toBe(98); // 2 tokens consumed
      expect(status2.remaining).toBe(100); // 0 tokens consumed
    });
  });

  describe('Tier-based Rate Limits', () => {
    it('should apply anonymous tier limits (100 requests/hour)', () => {
      const result = rateLimiter.checkLimit('192.168.1.6', 'anonymous');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(RATE_LIMIT_POLICIES.anonymous.requests);
      expect(result.limit).toBe(100);
    });

    it('should apply authenticated tier limits (1000 requests/hour)', () => {
      const result = rateLimiter.checkLimit('user-api-key-1', 'authenticated');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(RATE_LIMIT_POLICIES.authenticated.requests);
      expect(result.limit).toBe(1000);
    });

    it('should apply premium tier limits (10000 requests/hour)', () => {
      const result = rateLimiter.checkLimit('premium-api-key-1', 'premium');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(RATE_LIMIT_POLICIES.premium.requests);
      expect(result.limit).toBe(10000);
    });

    it('should handle same identifier across different tiers independently', () => {
      const identifier = 'test-user';

      rateLimiter.checkLimit(identifier, 'anonymous');
      rateLimiter.checkLimit(identifier, 'authenticated');
      rateLimiter.checkLimit(identifier, 'premium');

      const anonymousStatus = rateLimiter.getStatus(identifier, 'anonymous');
      const authStatus = rateLimiter.getStatus(identifier, 'authenticated');
      const premiumStatus = rateLimiter.getStatus(identifier, 'premium');

      expect(anonymousStatus.remaining).toBe(99);
      expect(authStatus.remaining).toBe(999);
      expect(premiumStatus.remaining).toBe(9999);
    });
  });

  describe('Token Refill Mechanism', () => {
    it('should refill tokens over time', async () => {
      vi.useFakeTimers();

      const ip = '192.168.1.7';
      const policy = RATE_LIMIT_POLICIES.anonymous;

      // Consume 50 tokens
      for (let i = 0; i < 50; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      let status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.remaining).toBe(50);

      // Advance time by 30 minutes (half the window)
      vi.advanceTimersByTime(30 * 60 * 1000);

      // Should have refilled ~50 tokens (50% of capacity)
      status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.remaining).toBeGreaterThan(90);
      expect(status.remaining).toBeLessThanOrEqual(100);
    });

    it('should not exceed capacity when refilling', async () => {
      vi.useFakeTimers();

      const ip = '192.168.1.8';

      // Initial state: full capacity
      let status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.remaining).toBe(100);

      // Advance time by 2 hours (double the window)
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      // Should still be at capacity, not exceeding it
      status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.remaining).toBe(100);
    });

    it('should calculate correct refill rate', () => {
      const anonymousPolicy = RATE_LIMIT_POLICIES.anonymous;
      const refillRate = anonymousPolicy.requests / anonymousPolicy.window;

      // refillRate should be tokens per millisecond
      // 100 requests / 3600000ms = 0.00002777... tokens/ms
      expect(refillRate).toBeCloseTo(0.0000277778, 10);

      // In 1 second (1000ms), should generate ~0.0278 tokens
      const tokensPerSecond = refillRate * 1000;
      expect(tokensPerSecond).toBeCloseTo(0.0278, 3);
    });
  });

  describe('getStatus - Check Without Consuming', () => {
    it('should check status without consuming tokens', () => {
      const ip = '192.168.1.9';

      // Check status multiple times
      const status1 = rateLimiter.getStatus(ip, 'anonymous');
      const status2 = rateLimiter.getStatus(ip, 'anonymous');
      const status3 = rateLimiter.getStatus(ip, 'anonymous');

      // All should report same remaining tokens
      expect(status1.remaining).toBe(100);
      expect(status2.remaining).toBe(100);
      expect(status3.remaining).toBe(100);
    });

    it('should show correct status after consuming tokens', () => {
      const ip = '192.168.1.10';

      rateLimiter.checkLimit(ip, 'anonymous');
      rateLimiter.checkLimit(ip, 'anonymous');
      rateLimiter.checkLimit(ip, 'anonymous');

      const status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.remaining).toBe(97);
    });

    it('should indicate when rate limit would be exceeded', () => {
      const ip = '192.168.1.11';

      // Consume all tokens
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.allowed).toBe(false);
      expect(status.remaining).toBe(0);
    });
  });

  describe('reset operations', () => {
    it('should reset individual identifier', () => {
      const ip = '192.168.1.12';

      // Consume some tokens
      rateLimiter.checkLimit(ip, 'anonymous');
      rateLimiter.checkLimit(ip, 'anonymous');
      rateLimiter.checkLimit(ip, 'anonymous');

      let status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.remaining).toBe(97);

      // Reset
      rateLimiter.reset(ip, 'anonymous');

      // Should be back to full capacity
      status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.remaining).toBe(100);
    });

    it('should reset only specified tier', () => {
      const identifier = 'test-user';

      // Consume tokens in both tiers
      rateLimiter.checkLimit(identifier, 'anonymous');
      rateLimiter.checkLimit(identifier, 'authenticated');

      // Reset anonymous tier only
      rateLimiter.reset(identifier, 'anonymous');

      const anonymousStatus = rateLimiter.getStatus(identifier, 'anonymous');
      const authStatus = rateLimiter.getStatus(identifier, 'authenticated');

      expect(anonymousStatus.remaining).toBe(100); // Reset
      expect(authStatus.remaining).toBe(999); // Not reset
    });

    it('should reset all buckets', () => {
      const ip1 = '192.168.1.13';
      const ip2 = '192.168.1.14';

      // Consume tokens from multiple identifiers
      rateLimiter.checkLimit(ip1, 'anonymous');
      rateLimiter.checkLimit(ip2, 'authenticated');

      // Reset all
      rateLimiter.resetAll();

      const status1 = rateLimiter.getStatus(ip1, 'anonymous');
      const status2 = rateLimiter.getStatus(ip2, 'authenticated');

      expect(status1.remaining).toBe(100);
      expect(status2.remaining).toBe(1000);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track total requests', () => {
      rateLimiter.checkLimit('ip1', 'anonymous');
      rateLimiter.checkLimit('ip2', 'anonymous');
      rateLimiter.checkLimit('ip3', 'anonymous');

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(3);
    });

    it('should track allowed and blocked requests', () => {
      const ip = '192.168.1.15';

      // Allowed requests
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      // Blocked requests
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const stats = rateLimiter.getStats();
      expect(stats.allowed).toBe(100);
      expect(stats.blocked).toBe(5);
      expect(stats.totalRequests).toBe(105);
    });

    it('should calculate block rate correctly', () => {
      const ip = '192.168.1.16';

      // 100 allowed, 10 blocked = 10% block rate
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const stats = rateLimiter.getStats();
      expect(stats.blockRate).toBeCloseTo(9.09, 1); // 10/110 ≈ 9.09%
    });

    it('should track active buckets', () => {
      rateLimiter.checkLimit('ip1', 'anonymous');
      rateLimiter.checkLimit('ip2', 'anonymous');
      rateLimiter.checkLimit('ip3', 'authenticated');

      const stats = rateLimiter.getStats();
      expect(stats.activeBuckets).toBe(3);
    });

    it('should count violations', () => {
      const ip = '192.168.1.17';

      // Exceed limit
      for (let i = 0; i < 105; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const stats = rateLimiter.getStats();
      expect(stats.violations).toBe(5);
    });

    it('should reset statistics', () => {
      rateLimiter.checkLimit('ip1', 'anonymous');
      rateLimiter.checkLimit('ip2', 'anonymous');

      // Trigger violation
      const ip = '192.168.1.18';
      for (let i = 0; i < 101; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      rateLimiter.resetStats();

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.allowed).toBe(0);
      expect(stats.blocked).toBe(0);
      expect(stats.violations).toBe(0);
      expect(stats.recentViolations).toBe(0);
    });

    it('should show 0 block rate when no requests', () => {
      const stats = rateLimiter.getStats();
      expect(stats.blockRate).toBe(0);
    });
  });

  describe('Violation Tracking', () => {
    it('should record violations when rate limit exceeded', () => {
      const ip = '192.168.1.19';

      // Exceed limit
      for (let i = 0; i < 101; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const violations = rateLimiter.getViolations(ip);
      expect(violations.length).toBe(1);
      expect(violations[0].identifier).toBe(ip);
      expect(violations[0].tier).toBe('anonymous');
      expect(violations[0].limit).toBe(100);
    });

    it('should get all violations without filter', () => {
      const ip1 = '192.168.1.20';
      const ip2 = '192.168.1.21';

      // Cause violations from multiple IPs
      for (let i = 0; i < 101; i++) {
        rateLimiter.checkLimit(ip1, 'anonymous');
        rateLimiter.checkLimit(ip2, 'anonymous');
      }

      const allViolations = rateLimiter.getViolations();
      expect(allViolations.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter violations by identifier', () => {
      const ip1 = '192.168.1.22';
      const ip2 = '192.168.1.23';

      // Cause violations from both IPs
      for (let i = 0; i < 101; i++) {
        rateLimiter.checkLimit(ip1, 'anonymous');
        rateLimiter.checkLimit(ip2, 'anonymous');
      }

      const ip1Violations = rateLimiter.getViolations(ip1);
      const ip2Violations = rateLimiter.getViolations(ip2);

      expect(ip1Violations.length).toBeGreaterThan(0);
      expect(ip2Violations.length).toBeGreaterThan(0);

      ip1Violations.forEach(v => {
        expect(v.identifier).toBe(ip1);
      });

      ip2Violations.forEach(v => {
        expect(v.identifier).toBe(ip2);
      });
    });

    it('should include timestamp in violation records', () => {
      const ip = '192.168.1.24';

      for (let i = 0; i < 101; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const violations = rateLimiter.getViolations(ip);
      expect(violations[0].timestamp).toBeGreaterThan(0);
      expect(violations[0].timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tokens remaining', () => {
      const ip = '192.168.1.25';

      // Consume all tokens
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const status = rateLimiter.getStatus(ip, 'anonymous');
      expect(status.remaining).toBe(0);
      expect(status.allowed).toBe(false);
    });

    it('should handle rapid successive requests', () => {
      const ip = '192.168.1.26';

      // Make 10 requests as fast as possible
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(rateLimiter.checkLimit(ip, 'anonymous'));
      }

      // All should be allowed
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });

      // Last result should show 90 remaining
      expect(results[9].remaining).toBe(90);
    });

    it('should handle empty identifier string', () => {
      const result = rateLimiter.checkLimit('', 'anonymous');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
    });

    it('should handle special characters in identifier', () => {
      const specialIds = [
        '192.168.1.1:8080',
        'user@example.com',
        'key-with-dashes',
        'key_with_underscores'
      ];

      specialIds.forEach(id => {
        const result = rateLimiter.checkLimit(id, 'anonymous');
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('Retry After Calculation', () => {
    it('should provide retryAfter when blocked', () => {
      const ip = '192.168.1.27';

      // Exhaust tokens
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const blocked = rateLimiter.checkLimit(ip, 'anonymous');
      expect(blocked.retryAfter).toBeGreaterThan(0);
      expect(typeof blocked.retryAfter).toBe('number');
    });

    it('should not provide retryAfter when allowed', () => {
      const result = rateLimiter.checkLimit('192.168.1.28', 'anonymous');
      expect(result.retryAfter).toBeUndefined();
    });
  });

  describe('Reset Time Calculation', () => {
    it('should provide reset timestamp', () => {
      const result = rateLimiter.checkLimit('192.168.1.29', 'anonymous');

      expect(result.reset).toBeGreaterThan(0);
      expect(result.reset).toBeGreaterThan(Date.now() / 1000); // Unix timestamp in seconds
    });

    it('should update reset time as tokens are consumed', () => {
      const ip = '192.168.1.30';

      const result1 = rateLimiter.checkLimit(ip, 'anonymous');
      const reset1 = result1.reset;

      // Consume more tokens
      for (let i = 0; i < 50; i++) {
        rateLimiter.checkLimit(ip, 'anonymous');
      }

      const result2 = rateLimiter.getStatus(ip, 'anonymous');
      const reset2 = result2.reset;

      // Reset time should be further in the future
      expect(reset2).toBeGreaterThan(reset1);
    });
  });

  describe('Token Bucket State', () => {
    it('should create bucket with correct initial state', () => {
      const ip = '192.168.1.31';
      rateLimiter.checkLimit(ip, 'anonymous');

      const buckets = rateLimiter.getBuckets();
      const bucketKey = `anonymous:${ip}`;
      const bucket = buckets.get(bucketKey);

      expect(bucket).toBeDefined();
      expect(bucket?.tokens).toBeLessThanOrEqual(100);
      expect(bucket?.capacity).toBe(100);
      expect(bucket?.refillRate).toBeGreaterThan(0);
      expect(bucket?.lastRefill).toBeGreaterThan(0);
    });

    it('should maintain separate buckets for different tiers', () => {
      const identifier = 'test-user';

      rateLimiter.checkLimit(identifier, 'anonymous');
      rateLimiter.checkLimit(identifier, 'authenticated');

      const buckets = rateLimiter.getBuckets();
      expect(buckets.has(`anonymous:${identifier}`)).toBe(true);
      expect(buckets.has(`authenticated:${identifier}`)).toBe(true);
    });
  });

  describe('All Tiers Coverage', () => {
    it('should support all defined tiers', () => {
      const tiers: RateLimitTier[] = ['anonymous', 'authenticated', 'premium'];
      const identifier = 'test-user';

      tiers.forEach(tier => {
        const result = rateLimiter.checkLimit(identifier, tier);
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(RATE_LIMIT_POLICIES[tier].requests);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of requests efficiently', () => {
      const startTime = Date.now();

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkLimit(`ip-${i}`, 'anonymous');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple identifiers efficiently', () => {
      const identifiers = Array.from({ length: 100 }, (_, i) => `user-${i}`);

      const startTime = Date.now();

      identifiers.forEach(id => {
        rateLimiter.checkLimit(id, 'anonymous');
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);

      const stats = rateLimiter.getStats();
      expect(stats.activeBuckets).toBe(100);
    });
  });
});
