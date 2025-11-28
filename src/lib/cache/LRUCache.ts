/**
 * LRU 캐시 시스템
 *
 * 메모리 기반 LRU (Least Recently Used) 캐시 구현
 * - lru-cache 라이브러리 활용
 * - TTL 정책 지원 (타입별 자동 설정)
 * - 캐시 통계 수집 및 모니터링
 * - Singleton 패턴 적용
 */

import { LRUCache } from 'lru-cache';
import {
  CacheType,
  CacheOptions,
  CacheStats,
  CacheEntry,
  CacheResult,
  LRUCacheConfig,
  CACHE_TTL_POLICIES
} from '../types/cache';
import { logger } from '../utils/logger';

/**
 * LRU 캐시 관리자 (Singleton)
 *
 * @example
 * ```typescript
 * const cache = LRUCacheManager.getInstance();
 *
 * // 데이터 저장
 * cache.set('address', 'seoul-123', addressData);
 *
 * // 데이터 조회
 * const result = cache.get<AddressResult>('address', 'seoul-123');
 * if (result.hit) {
 *   console.log('Cache hit:', result.value);
 * }
 *
 * // 통계 확인
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${stats.hitRate}%`);
 * ```
 */
export class LRUCacheManager {
  private static instance: LRUCacheManager;
  private cache: LRUCache<string, CacheEntry<unknown>>;

  // 캐시 통계
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  private constructor(config?: Partial<LRUCacheConfig>) {
    // 기본 설정
    const defaultConfig: LRUCacheConfig = {
      max: 1000,                    // 최대 1000개 항목
      maxSize: 50 * 1024 * 1024,   // 최대 50MB
      ttl: 3600 * 1000,            // 기본 1시간 TTL
      updateAgeOnGet: true         // 조회 시 수명 갱신
    };

    const finalConfig = { ...defaultConfig, ...config };

    // lru-cache 인스턴스 생성
    this.cache = new LRUCache<string, CacheEntry<unknown>>({
      max: finalConfig.max,
      maxSize: finalConfig.maxSize,
      ttl: finalConfig.ttl,
      updateAgeOnGet: finalConfig.updateAgeOnGet,
      sizeCalculation: (value: CacheEntry<unknown>) => this.calculateSize(value),
      // 항목 제거 시 로깅
      dispose: (value: CacheEntry<unknown>, key: string) => {
        logger.info('Cache entry evicted', {
          key,
          size: value.size,
          hits: value.hits
        });
      }
    });

    const maxSizeMB = (finalConfig.maxSize || 0) / 1024 / 1024;
    const ttlSec = (finalConfig.ttl || 0) / 1000;

    logger.info('LRU Cache initialized', {
      maxItems: finalConfig.max,
      maxSize: `${maxSizeMB}MB`,
      defaultTTL: `${ttlSec}s`
    });
  }

  /**
   * Singleton 인스턴스 반환
   */
  static getInstance(config?: Partial<LRUCacheConfig>): LRUCacheManager {
    if (!LRUCacheManager.instance) {
      LRUCacheManager.instance = new LRUCacheManager(config);
    }
    return LRUCacheManager.instance;
  }

  /**
   * 캐시 키 생성
   *
   * @param type - 캐시 타입
   * @param key - 항목 키
   * @returns 전체 캐시 키 (예: "address:seoul-123")
   */
  private buildKey(type: CacheType, key: string): string {
    return `${type}:${key}`;
  }

  /**
   * 항목 크기 계산 (바이트)
   *
   * @param value - 캐시 항목
   * @returns 추정 크기 (바이트)
   */
  private calculateSize(value: CacheEntry<unknown>): number {
    try {
      const json = JSON.stringify(value);
      // UTF-16 기준 (JavaScript 문자열)
      return json.length * 2;
    } catch {
      // JSON 직렬화 실패 시 기본값
      return 1024; // 1KB
    }
  }

  /**
   * TTL 가져오기
   *
   * @param type - 캐시 타입
   * @param customTTL - 사용자 지정 TTL (초)
   * @returns TTL (밀리초)
   */
  private getTTL(type: CacheType, customTTL?: number): number {
    if (customTTL !== undefined) {
      return customTTL * 1000;
    }
    return CACHE_TTL_POLICIES[type] * 1000;
  }

  /**
   * 캐시에 데이터 저장
   *
   * @param type - 캐시 타입
   * @param key - 항목 키
   * @param value - 저장할 값
   * @param options - 캐시 옵션
   */
  set<T>(
    type: CacheType,
    key: string,
    value: T,
    options?: CacheOptions
  ): void {
    const fullKey = this.buildKey(type, key);
    const now = Date.now();
    const ttl = this.getTTL(type, options?.ttl);

    const entry: CacheEntry<T> = {
      key: fullKey,
      value,
      createdAt: now,
      expiresAt: now + ttl,
      hits: 0,
      size: 0 // sizeCalculation에서 자동 계산됨
    };

    // 크기 계산
    entry.size = this.calculateSize(entry as CacheEntry<unknown>);

    this.cache.set(fullKey, entry as CacheEntry<unknown>, {
      ttl,
      size: entry.size
    });

    this.stats.sets++;

    logger.info('Cache set', {
      type,
      key,
      ttl: `${ttl / 1000}s`,
      size: `${entry.size} bytes`
    });
  }

  /**
   * 캐시에서 데이터 조회
   *
   * @param type - 캐시 타입
   * @param key - 항목 키
   * @returns 캐시 결과
   */
  get<T>(type: CacheType, key: string): CacheResult<T> {
    const fullKey = this.buildKey(type, key);
    const entry = this.cache.get(fullKey) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      logger.info('Cache miss', { type, key });

      return {
        value: null,
        hit: false,
        tier: 'L1'
      };
    }

    // 만료 체크 (이중 안전장치)
    const now = Date.now();
    if (entry.expiresAt < now) {
      this.cache.delete(fullKey);
      this.stats.misses++;
      logger.info('Cache expired', { type, key });

      return {
        value: null,
        hit: false,
        tier: 'L1'
      };
    }

    // 히트 카운트 증가
    entry.hits++;
    this.stats.hits++;

    const age = now - entry.createdAt;

    logger.info('Cache hit', {
      type,
      key,
      age: `${Math.round(age / 1000)}s`,
      hits: entry.hits
    });

    return {
      value: entry.value,
      hit: true,
      tier: 'L1',
      age
    };
  }

  /**
   * 캐시에서 항목 삭제
   *
   * @param type - 캐시 타입
   * @param key - 항목 키
   * @returns 삭제 성공 여부
   */
  delete(type: CacheType, key: string): boolean {
    const fullKey = this.buildKey(type, key);
    const deleted = this.cache.delete(fullKey);

    if (deleted) {
      this.stats.deletes++;
      logger.info('Cache delete', { type, key });
    }

    return deleted;
  }

  /**
   * 특정 타입의 모든 캐시 삭제
   *
   * @param type - 캐시 타입
   * @returns 삭제된 항목 수
   */
  deleteByType(type: CacheType): number {
    const prefix = `${type}:`;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.stats.deletes += count;
      logger.info('Cache type cleared', { type, count });
    }

    return count;
  }

  /**
   * 전체 캐시 삭제
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();

    logger.info('Cache cleared', { itemsCleared: size });
  }

  /**
   * 캐시에 항목이 있는지 확인
   *
   * @param type - 캐시 타입
   * @param key - 항목 키
   * @returns 존재 여부
   */
  has(type: CacheType, key: string): boolean {
    const fullKey = this.buildKey(type, key);
    return this.cache.has(fullKey);
  }

  /**
   * 캐시 통계 반환
   *
   * @returns 캐시 통계
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0
      ? (this.stats.hits / totalRequests) * 100
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: Math.round(hitRate * 100) / 100 // 소수점 2자리
    };
  }

  /**
   * 상세 캐시 정보 반환 (모니터링용)
   *
   * @returns 상세 통계
   */
  getDetailedStats() {
    const stats = this.getStats();

    return {
      ...stats,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      calculatedSize: this.cache.calculatedSize,
      maxCalculatedSize: this.cache.maxSize
    };
  }

  /**
   * 캐시 통계 초기화
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    logger.info('Cache stats reset');
  }

  /**
   * 모든 캐시 키 조회
   *
   * @returns 캐시 키 배열
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 특정 타입의 캐시 키 조회
   *
   * @param type - 캐시 타입
   * @returns 캐시 키 배열
   */
  keysByType(type: CacheType): string[] {
    const prefix = `${type}:`;
    return this.keys().filter(key => key.startsWith(prefix));
  }

  /**
   * 캐시 항목의 남은 수명 (밀리초)
   *
   * @param type - 캐시 타입
   * @param key - 항목 키
   * @returns 남은 TTL (밀리초), 없으면 0
   */
  getRemainingTTL(type: CacheType, key: string): number {
    const fullKey = this.buildKey(type, key);
    const ttl = this.cache.getRemainingTTL(fullKey);
    return ttl > 0 ? ttl : 0;
  }

  /**
   * 메모리 사용량 정보
   *
   * @returns 메모리 사용량 (바이트)
   */
  getMemoryUsage(): {
    current: number;
    max: number;
    percentage: number;
  } {
    const current = this.cache.calculatedSize || 0;
    const max = this.cache.maxSize || 0;
    const percentage = max > 0 ? (current / max) * 100 : 0;

    return {
      current,
      max,
      percentage: Math.round(percentage * 100) / 100
    };
  }
}

/**
 * 전역 LRU 캐시 인스턴스
 */
export const lruCache = LRUCacheManager.getInstance();
