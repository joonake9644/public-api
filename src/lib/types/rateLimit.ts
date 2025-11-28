/**
 * Rate Limiting 타입 정의
 *
 * API 요청 제한 및 토큰 버킷 알고리즘 관련 타입
 */

/**
 * Rate Limit 결과
 */
export interface RateLimitResult {
  allowed: boolean;       // 요청 허용 여부
  remaining: number;      // 남은 요청 수
  reset: number;          // 리셋 시간 (Unix timestamp)
  limit: number;          // 전체 제한 수
  retryAfter?: number;    // 재시도 가능 시간 (초)
}

/**
 * Rate Limit 설정
 */
export interface RateLimitConfig {
  requests: number;       // 허용 요청 수
  window: number;         // 시간 창 (밀리초)
  identifier: string;     // 식별자 (IP, API 키 등)
}

/**
 * Rate Limit Tier (사용자 등급별)
 */
export type RateLimitTier = 'anonymous' | 'authenticated' | 'premium';

/**
 * Tier별 Rate Limit 정책
 */
export const RATE_LIMIT_POLICIES: Record<RateLimitTier, RateLimitConfig> = {
  anonymous: {
    requests: 100,
    window: 3600000,     // 1시간
    identifier: 'ip'
  },
  authenticated: {
    requests: 1000,
    window: 3600000,     // 1시간
    identifier: 'api_key'
  },
  premium: {
    requests: 10000,
    window: 3600000,     // 1시간
    identifier: 'api_key'
  }
} as const;

/**
 * Rate Limit 저장소 (Redis 키)
 */
export interface RateLimitStore {
  key: string;
  count: number;
  windowStart: number;
  windowEnd: number;
}

/**
 * 토큰 버킷 상태
 */
export interface TokenBucketState {
  tokens: number;          // 현재 토큰 수
  lastRefill: number;      // 마지막 리필 시간
  capacity: number;        // 버킷 용량
  refillRate: number;      // 리필 속도 (tokens/ms)
}

/**
 * Rate Limit 헤더 (HTTP Response)
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Rate Limit 위반 정보
 */
export interface RateLimitViolation {
  identifier: string;
  tier: RateLimitTier;
  timestamp: number;
  attemptedRequests: number;
  limit: number;
}
