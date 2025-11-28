/**
 * 캐싱 시스템 모듈
 *
 * LRU 캐시 및 캐싱 관련 유틸리티 Export
 */

export { LRUCacheManager, lruCache } from './LRUCache';

// 타입 re-export (편의성)
export type {
  CacheType,
  CacheOptions,
  CacheStats,
  CacheEntry,
  CacheResult,
  CacheQuery,
  LRUCacheConfig,
  CacheTier,
  CacheInvalidationPattern
} from '../types/cache';

export { CACHE_TTL_POLICIES } from '../types/cache';
