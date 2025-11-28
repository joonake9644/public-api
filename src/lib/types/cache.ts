/**
 * 캐싱 시스템 타입 정의
 *
 * LRU 캐시 및 Redis 캐싱 관련 타입과 설정
 */

/**
 * 캐시 쿼리 키
 */
export interface CacheQuery {
  type: CacheType;
  key: string;
  params?: Record<string, unknown>;
}

/**
 * 캐시 타입
 */
export type CacheType =
  | 'address'      // 주소 검색
  | 'building'     // 건축물 정보
  | 'coordinate'   // 좌표 변환
  | 'realtime'     // 실시간 데이터
  | 'static';      // 정적 데이터

/**
 * 캐시 옵션
 */
export interface CacheOptions {
  ttl?: number;           // Time To Live (초)
  maxAge?: number;        // 최대 수명 (초)
  staleWhileRevalidate?: number;  // 갱신 중 stale 허용 시간
  tags?: string[];        // 캐시 태그 (무효화용)
}

/**
 * 캐시 TTL 정책
 */
export const CACHE_TTL_POLICIES: Record<CacheType, number> = {
  address: 86400,      // 24시간
  building: 86400,     // 24시간
  coordinate: 604800,  // 7일 (좌표 변환 결과는 불변)
  realtime: 300,       // 5분
  static: 2592000      // 30일
} as const;

/**
 * 캐시 통계
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * 캐시 항목
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
  size: number;
}

/**
 * LRU 캐시 설정
 */
export interface LRUCacheConfig {
  max: number;                // 최대 항목 수
  maxSize?: number;           // 최대 메모리 크기 (바이트)
  ttl?: number;              // 기본 TTL (밀리초)
  updateAgeOnGet?: boolean;  // 조회 시 수명 갱신
  sizeCalculation?: (value: unknown) => number;
}

/**
 * Redis 캐시 설정
 */
export interface RedisCacheConfig {
  url: string;
  prefix: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
}

/**
 * 캐시 무효화 패턴
 */
export interface CacheInvalidationPattern {
  pattern: string;   // Redis key 패턴 (예: "address:*")
  tags?: string[];   // 태그 기반 무효화
}

/**
 * 캐시 계층 (Multi-tier)
 */
export type CacheTier = 'L1' | 'L2';

/**
 * 캐시 결과
 */
export interface CacheResult<T> {
  value: T | null;
  hit: boolean;
  tier?: CacheTier;
  age?: number;  // 캐시된 시간 (밀리초)
}
