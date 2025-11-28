/**
 * LRUCacheManager Unit Tests
 *
 * Tests all LRU cache functionality including:
 * - Set/Get operations
 * - TTL policies
 * - Cache statistics
 * - Memory management
 * - Type-based operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCacheManager } from '../LRUCache';
import type { CacheType } from '@/src/lib/types/cache';
import { CACHE_TTL_POLICIES } from '@/src/lib/types/cache';

describe('LRUCacheManager', () => {
  let cache: LRUCacheManager;

  beforeEach(() => {
    // Get singleton instance with test config
    cache = LRUCacheManager.getInstance({
      max: 100,
      maxSize: 1024 * 1024, // 1MB for testing
      ttl: 3600 * 1000 // 1 hour default
    });

    // Clear cache and reset stats before each test
    cache.clear();
    cache.resetStats();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = LRUCacheManager.getInstance();
      const instance2 = LRUCacheManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('set and get operations', () => {
    it('should store and retrieve string values', () => {
      cache.set('address', 'seoul-123', 'Seoul City Hall');

      const result = cache.get<string>('address', 'seoul-123');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('Seoul City Hall');
      expect(result.tier).toBe('L1');
    });

    it('should store and retrieve object values', () => {
      const addressData = {
        roadAddr: '서울특별시 중구 세종대로 110',
        jibunAddr: '서울특별시 중구 태평로1가 31',
        zipNo: '04524',
        latitude: 37.5665,
        longitude: 126.9780
      };

      cache.set('address', 'seoul-city-hall', addressData);

      const result = cache.get<typeof addressData>('address', 'seoul-city-hall');
      expect(result.hit).toBe(true);
      expect(result.value).toEqual(addressData);
    });

    it('should store and retrieve array values', () => {
      const coordinates = [
        { x: 198056.37, y: 551885.03 },
        { x: 389076.80, y: 288993.76 }
      ];

      cache.set('coordinate', 'seoul-busan', coordinates);

      const result = cache.get<typeof coordinates>('coordinate', 'seoul-busan');
      expect(result.hit).toBe(true);
      expect(result.value).toEqual(coordinates);
    });

    it('should return cache miss for non-existent key', () => {
      const result = cache.get<string>('address', 'non-existent');

      expect(result.hit).toBe(false);
      expect(result.value).toBeNull();
      expect(result.tier).toBe('L1');
    });

    it('should handle multiple cache types independently', () => {
      cache.set('address', 'key1', 'Address Data');
      cache.set('building', 'key1', 'Building Data');
      cache.set('coordinate', 'key1', { x: 100, y: 200 });

      expect(cache.get<string>('address', 'key1').value).toBe('Address Data');
      expect(cache.get<string>('building', 'key1').value).toBe('Building Data');
      expect(cache.get<{x: number, y: number}>('coordinate', 'key1').value).toEqual({ x: 100, y: 200 });
    });
  });

  describe('TTL Policies', () => {
    it('should use correct TTL for address cache type', () => {
      cache.set('address', 'test-key', 'test-value');

      const ttl = cache.getRemainingTTL('address', 'test-key');
      const expectedTTL = CACHE_TTL_POLICIES.address * 1000; // 24 hours in ms

      // TTL should be close to expected (within 1000ms tolerance for lru-cache buffer)
      expect(ttl).toBeGreaterThan(expectedTTL - 1000);
      expect(ttl).toBeLessThanOrEqual(expectedTTL + 1000);
    });

    it('should use correct TTL for coordinate cache type', () => {
      cache.set('coordinate', 'test-key', { x: 100, y: 200 });

      const ttl = cache.getRemainingTTL('coordinate', 'test-key');
      const expectedTTL = CACHE_TTL_POLICIES.coordinate * 1000; // 7 days in ms

      expect(ttl).toBeGreaterThan(expectedTTL - 1000);
      expect(ttl).toBeLessThanOrEqual(expectedTTL + 1000);
    });

    it('should use correct TTL for realtime cache type', () => {
      cache.set('realtime', 'test-key', 'real-time data');

      const ttl = cache.getRemainingTTL('realtime', 'test-key');
      const expectedTTL = CACHE_TTL_POLICIES.realtime * 1000; // 5 minutes in ms

      expect(ttl).toBeGreaterThan(expectedTTL - 1000);
      expect(ttl).toBeLessThanOrEqual(expectedTTL + 1000);
    });

    it('should use custom TTL when provided', () => {
      const customTTL = 60; // 60 seconds
      cache.set('address', 'test-key', 'test-value', { ttl: customTTL });

      const ttl = cache.getRemainingTTL('address', 'test-key');
      const expectedTTL = customTTL * 1000;

      expect(ttl).toBeGreaterThan(expectedTTL - 1000);
      expect(ttl).toBeLessThanOrEqual(expectedTTL + 1000);
    });

    it('should expire items after TTL', async () => {
      const shortTTL = 0.1; // 100ms
      cache.set('realtime', 'expire-test', 'will expire', { ttl: shortTTL });

      // Should be available immediately
      expect(cache.get('realtime', 'expire-test').hit).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(cache.get('realtime', 'expire-test').hit).toBe(false);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits correctly', () => {
      cache.set('address', 'key1', 'value1');

      cache.get('address', 'key1'); // Hit
      cache.get('address', 'key1'); // Hit
      cache.get('address', 'key1'); // Hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(0);
    });

    it('should track cache misses correctly', () => {
      cache.get('address', 'non-existent-1'); // Miss
      cache.get('address', 'non-existent-2'); // Miss
      cache.get('address', 'non-existent-3'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(3);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('address', 'key1', 'value1');
      cache.set('address', 'key2', 'value2');

      cache.get('address', 'key1'); // Hit
      cache.get('address', 'key2'); // Hit
      cache.get('address', 'key3'); // Miss
      cache.get('address', 'key4'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(50.0); // 2/4 = 50%
    });

    it('should return 0 hit rate when no requests', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should track cache size', () => {
      cache.set('address', 'key1', 'value1');
      cache.set('address', 'key2', 'value2');
      cache.set('building', 'key3', 'value3');

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
    });

    it('should track detailed statistics', () => {
      cache.set('address', 'key1', 'value1');
      cache.set('address', 'key2', 'value2');
      cache.delete('address', 'key1');

      cache.get('address', 'key2'); // Hit
      cache.get('address', 'key3'); // Miss

      const detailedStats = cache.getDetailedStats();

      expect(detailedStats.sets).toBe(2);
      expect(detailedStats.deletes).toBe(1);
      expect(detailedStats.hits).toBe(1);
      expect(detailedStats.misses).toBe(1);
      expect(detailedStats).toHaveProperty('calculatedSize');
      expect(detailedStats).toHaveProperty('maxCalculatedSize');
    });

    it('should reset statistics', () => {
      cache.set('address', 'key1', 'value1');
      cache.get('address', 'key1'); // Hit
      cache.get('address', 'key2'); // Miss

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should track hit count per cache entry', () => {
      cache.set('address', 'popular-key', 'popular-value');

      // Access multiple times
      for (let i = 0; i < 5; i++) {
        cache.get('address', 'popular-key');
      }

      const stats = cache.getStats();
      expect(stats.hits).toBe(5);
    });
  });

  describe('delete operations', () => {
    it('should delete single cache entry', () => {
      cache.set('address', 'key1', 'value1');
      expect(cache.has('address', 'key1')).toBe(true);

      const deleted = cache.delete('address', 'key1');
      expect(deleted).toBe(true);
      expect(cache.has('address', 'key1')).toBe(false);
    });

    it('should return false when deleting non-existent entry', () => {
      const deleted = cache.delete('address', 'non-existent');
      expect(deleted).toBe(false);
    });

    it('should delete all entries of specific type', () => {
      cache.set('address', 'key1', 'value1');
      cache.set('address', 'key2', 'value2');
      cache.set('address', 'key3', 'value3');
      cache.set('building', 'key4', 'value4');

      const deletedCount = cache.deleteByType('address');
      expect(deletedCount).toBe(3);

      expect(cache.has('address', 'key1')).toBe(false);
      expect(cache.has('address', 'key2')).toBe(false);
      expect(cache.has('address', 'key3')).toBe(false);
      expect(cache.has('building', 'key4')).toBe(true); // Different type
    });

    it('should return 0 when deleting type with no entries', () => {
      const deletedCount = cache.deleteByType('coordinate');
      expect(deletedCount).toBe(0);
    });

    it('should clear all cache entries', () => {
      cache.set('address', 'key1', 'value1');
      cache.set('building', 'key2', 'value2');
      cache.set('coordinate', 'key3', { x: 100, y: 200 });

      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(cache.has('address', 'key1')).toBe(false);
      expect(cache.has('building', 'key2')).toBe(false);
      expect(cache.has('coordinate', 'key3')).toBe(false);
    });
  });

  describe('has operation', () => {
    it('should return true for existing entry', () => {
      cache.set('address', 'key1', 'value1');
      expect(cache.has('address', 'key1')).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(cache.has('address', 'non-existent')).toBe(false);
    });

    it('should return false after deletion', () => {
      cache.set('address', 'key1', 'value1');
      cache.delete('address', 'key1');
      expect(cache.has('address', 'key1')).toBe(false);
    });
  });

  describe('keys operations', () => {
    it('should return all cache keys', () => {
      cache.set('address', 'key1', 'value1');
      cache.set('building', 'key2', 'value2');
      cache.set('coordinate', 'key3', { x: 100, y: 200 });

      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('address:key1');
      expect(keys).toContain('building:key2');
      expect(keys).toContain('coordinate:key3');
    });

    it('should return empty array when cache is empty', () => {
      const keys = cache.keys();
      expect(keys).toHaveLength(0);
    });

    it('should return keys by type', () => {
      cache.set('address', 'key1', 'value1');
      cache.set('address', 'key2', 'value2');
      cache.set('building', 'key3', 'value3');
      cache.set('coordinate', 'key4', { x: 100, y: 200 });

      const addressKeys = cache.keysByType('address');
      expect(addressKeys).toHaveLength(2);
      expect(addressKeys).toContain('address:key1');
      expect(addressKeys).toContain('address:key2');

      const buildingKeys = cache.keysByType('building');
      expect(buildingKeys).toHaveLength(1);
      expect(buildingKeys).toContain('building:key3');
    });

    it('should return empty array for type with no keys', () => {
      cache.set('address', 'key1', 'value1');

      const buildingKeys = cache.keysByType('building');
      expect(buildingKeys).toHaveLength(0);
    });
  });

  describe('getRemainingTTL', () => {
    it('should return remaining TTL for existing entry', () => {
      cache.set('address', 'key1', 'value1');

      const ttl = cache.getRemainingTTL('address', 'key1');
      const expectedTTL = CACHE_TTL_POLICIES.address * 1000;

      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(expectedTTL + 1000);
    });

    it('should return 0 for non-existent entry', () => {
      const ttl = cache.getRemainingTTL('address', 'non-existent');
      expect(ttl).toBe(0);
    });

    it('should return 0 for expired entry', async () => {
      const shortTTL = 0.1; // 100ms
      cache.set('realtime', 'expire-test', 'will expire', { ttl: shortTTL });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const ttl = cache.getRemainingTTL('realtime', 'expire-test');
      expect(ttl).toBe(0);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage information', () => {
      cache.set('address', 'key1', 'small value');
      cache.set('address', 'key2', 'another small value');

      const memoryUsage = cache.getMemoryUsage();

      expect(memoryUsage).toHaveProperty('current');
      expect(memoryUsage).toHaveProperty('max');
      expect(memoryUsage).toHaveProperty('percentage');

      expect(memoryUsage.current).toBeGreaterThan(0);
      expect(memoryUsage.max).toBeGreaterThan(0);
      expect(memoryUsage.percentage).toBeGreaterThanOrEqual(0);
      expect(memoryUsage.percentage).toBeLessThanOrEqual(100);
    });

    it('should track memory usage as items are added', () => {
      const usage1 = cache.getMemoryUsage();
      const initialSize = usage1.current;

      // Add large object
      const largeData = {
        data: 'x'.repeat(1000), // 1000 characters
        metadata: { timestamp: Date.now() }
      };
      cache.set('static', 'large-key', largeData);

      const usage2 = cache.getMemoryUsage();
      expect(usage2.current).toBeGreaterThan(initialSize);
    });

    it('should calculate percentage correctly', () => {
      // Fill cache with known data
      for (let i = 0; i < 10; i++) {
        cache.set('static', `key-${i}`, { data: 'test data' });
      }

      const memoryUsage = cache.getMemoryUsage();
      const expectedPercentage = (memoryUsage.current / memoryUsage.max) * 100;

      expect(memoryUsage.percentage).toBeCloseTo(expectedPercentage, 2);
    });
  });

  describe('Cache Entry Metadata', () => {
    it('should track entry age', async () => {
      cache.set('address', 'key1', 'value1');

      // Wait 50ms
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = cache.get<string>('address', 'key1');
      expect(result.age).toBeGreaterThanOrEqual(50);
      expect(result.age).toBeLessThan(100); // Should be less than 100ms
    });

    it('should track hit count per entry', () => {
      cache.set('address', 'key1', 'value1');

      // Access multiple times
      cache.get('address', 'key1');
      cache.get('address', 'key1');
      cache.get('address', 'key1');

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      cache.set('address', 'null-key', null);

      const result = cache.get<null>('address', 'null-key');
      expect(result.hit).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should handle undefined values', () => {
      cache.set('address', 'undefined-key', undefined);

      const result = cache.get<undefined>('address', 'undefined-key');
      expect(result.hit).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it('should handle empty string values', () => {
      cache.set('address', 'empty-key', '');

      const result = cache.get<string>('address', 'empty-key');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('');
    });

    it('should handle numeric values', () => {
      cache.set('coordinate', 'zero', 0);
      cache.set('coordinate', 'negative', -123.456);

      expect(cache.get<number>('coordinate', 'zero').value).toBe(0);
      expect(cache.get<number>('coordinate', 'negative').value).toBe(-123.456);
    });

    it('should handle boolean values', () => {
      cache.set('static', 'true-key', true);
      cache.set('static', 'false-key', false);

      expect(cache.get<boolean>('static', 'true-key').value).toBe(true);
      expect(cache.get<boolean>('static', 'false-key').value).toBe(false);
    });

    it('should handle complex nested objects', () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, 3],
              nested: { key: 'value' }
            }
          }
        }
      };

      cache.set('static', 'complex-key', complexData);

      const result = cache.get<typeof complexData>('static', 'complex-key');
      expect(result.value).toEqual(complexData);
    });

    it('should handle very long keys', () => {
      const longKey = 'k'.repeat(1000);
      cache.set('address', longKey, 'value');

      const result = cache.get<string>('address', longKey);
      expect(result.hit).toBe(true);
      expect(result.value).toBe('value');
    });

    it('should handle special characters in keys', () => {
      const specialKeys = [
        'key:with:colons',
        'key/with/slashes',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots'
      ];

      specialKeys.forEach(key => {
        cache.set('address', key, `value-${key}`);
        expect(cache.get<string>('address', key).hit).toBe(true);
      });
    });
  });

  describe('All Cache Types Coverage', () => {
    it('should support all defined cache types', () => {
      const cacheTypes: CacheType[] = ['address', 'building', 'coordinate', 'realtime', 'static'];

      cacheTypes.forEach(type => {
        cache.set(type, 'test-key', `value-${type}`);
        const result = cache.get<string>(type, 'test-key');

        expect(result.hit).toBe(true);
        expect(result.value).toBe(`value-${type}`);
      });
    });

    it('should apply correct TTL policies for all types', () => {
      const types: CacheType[] = ['address', 'building', 'coordinate', 'realtime', 'static'];

      types.forEach(type => {
        cache.set(type, `${type}-key`, `${type}-value`);
        const ttl = cache.getRemainingTTL(type, `${type}-key`);
        const expectedTTL = CACHE_TTL_POLICIES[type] * 1000;

        expect(ttl).toBeGreaterThan(expectedTTL - 1000);
        expect(ttl).toBeLessThanOrEqual(expectedTTL + 1000);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of entries efficiently', () => {
      const startTime = Date.now();

      // Add 100 entries
      for (let i = 0; i < 100; i++) {
        cache.set('static', `key-${i}`, { data: `value-${i}` });
      }

      const setDuration = Date.now() - startTime;
      expect(setDuration).toBeLessThan(1000); // Should complete within 1 second

      // Retrieve all entries
      const getStartTime = Date.now();
      for (let i = 0; i < 100; i++) {
        cache.get('static', `key-${i}`);
      }
      const getDuration = Date.now() - getStartTime;
      expect(getDuration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle rapid sequential operations', () => {
      const key = 'rapid-key';

      // Rapid set/get cycles
      for (let i = 0; i < 50; i++) {
        cache.set('realtime', key, `value-${i}`);
        const result = cache.get<string>('realtime', key);
        expect(result.value).toBe(`value-${i}`);
      }

      const stats = cache.getStats();
      expect(stats.hits).toBe(50);
    });
  });
});
