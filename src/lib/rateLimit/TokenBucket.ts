/**
 * 토큰 버킷 알고리즘 기반 Rate Limiter
 *
 * Token Bucket 알고리즘을 사용한 API 요청 제한 시스템
 * - 일정 속도로 토큰이 채워지는 버킷
 * - 요청마다 토큰 1개 소비
 * - 토큰이 없으면 요청 거부
 * - Tier별 제한 설정 지원
 * - 메모리 기반 (개발용)
 */

import {
  RateLimitResult,
  RateLimitConfig,
  RateLimitTier,
  RateLimitViolation,
  TokenBucketState,
  RATE_LIMIT_POLICIES
} from '../types/rateLimit';
import { logger } from '../utils/logger';

/**
 * 토큰 버킷 Rate Limiter (Singleton)
 *
 * @example
 * ```typescript
 * const rateLimiter = TokenBucketRateLimiter.getInstance();
 *
 * // 요청 확인
 * const result = rateLimiter.checkLimit('192.168.1.1', 'anonymous');
 * if (!result.allowed) {
 *   throw new RateLimitError(`Too many requests. Retry after ${result.retryAfter}s`);
 * }
 *
 * // 통계 확인
 * const stats = rateLimiter.getStats();
 * console.log(`Total requests: ${stats.totalRequests}`);
 * ```
 */
export class TokenBucketRateLimiter {
  private static instance: TokenBucketRateLimiter;

  // 메모리 기반 버킷 저장소 (개발용)
  // Map<identifier, TokenBucketState>
  private buckets = new Map<string, TokenBucketState>();

  // Rate Limit 위반 기록
  private violations: RateLimitViolation[] = [];

  // 통계
  private stats = {
    totalRequests: 0,
    allowed: 0,
    blocked: 0,
    violations: 0
  };

  private constructor() {
    logger.info('Token Bucket Rate Limiter initialized');

    // 정기적으로 오래된 버킷 정리 (1시간마다)
    this.startCleanupInterval();
  }

  /**
   * Singleton 인스턴스 반환
   */
  static getInstance(): TokenBucketRateLimiter {
    if (!TokenBucketRateLimiter.instance) {
      TokenBucketRateLimiter.instance = new TokenBucketRateLimiter();
    }
    return TokenBucketRateLimiter.instance;
  }

  /**
   * Rate Limit 확인
   *
   * @param identifier - 식별자 (IP 주소, API 키 등)
   * @param tier - 사용자 등급
   * @returns Rate Limit 결과
   */
  checkLimit(identifier: string, tier: RateLimitTier = 'anonymous'): RateLimitResult {
    this.stats.totalRequests++;

    const policy = RATE_LIMIT_POLICIES[tier];
    const bucketKey = this.getBucketKey(identifier, tier);
    const now = Date.now();

    // 버킷 가져오기 또는 생성
    let bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      bucket = this.createBucket(policy);
      this.buckets.set(bucketKey, bucket);
    }

    // 토큰 리필
    this.refillTokens(bucket, policy, now);

    // 토큰 사용 가능 여부 확인
    if (bucket.tokens >= 1) {
      // 토큰 소비
      bucket.tokens -= 1;
      this.stats.allowed++;

      const result: RateLimitResult = {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        reset: this.calculateResetTime(bucket, policy),
        limit: policy.requests
      };

      logger.info('Rate limit check: allowed', {
        identifier,
        tier,
        remaining: result.remaining,
        limit: result.limit
      });

      return result;
    }

    // Rate Limit 초과
    this.stats.blocked++;
    this.stats.violations++;

    // 위반 기록
    this.recordViolation(identifier, tier, policy.requests);

    const retryAfter = this.calculateRetryAfter(bucket, policy);

    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      reset: this.calculateResetTime(bucket, policy),
      limit: policy.requests,
      retryAfter
    };

    logger.warn('Rate limit exceeded', {
      identifier,
      tier,
      limit: policy.requests,
      retryAfter
    });

    return result;
  }

  /**
   * 특정 식별자의 Rate Limit 상태 조회
   *
   * @param identifier - 식별자
   * @param tier - 사용자 등급
   * @returns Rate Limit 결과 (토큰 소비 없음)
   */
  getStatus(identifier: string, tier: RateLimitTier = 'anonymous'): RateLimitResult {
    const policy = RATE_LIMIT_POLICIES[tier];
    const bucketKey = this.getBucketKey(identifier, tier);
    const now = Date.now();

    let bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      bucket = this.createBucket(policy);
      this.buckets.set(bucketKey, bucket);
    }

    // 토큰 리필 (소비하지 않고 상태만 확인)
    this.refillTokens(bucket, policy, now);

    return {
      allowed: bucket.tokens >= 1,
      remaining: Math.floor(bucket.tokens),
      reset: this.calculateResetTime(bucket, policy),
      limit: policy.requests
    };
  }

  /**
   * 특정 식별자의 Rate Limit 초기화
   *
   * @param identifier - 식별자
   * @param tier - 사용자 등급
   */
  reset(identifier: string, tier: RateLimitTier = 'anonymous'): void {
    const bucketKey = this.getBucketKey(identifier, tier);
    this.buckets.delete(bucketKey);

    logger.info('Rate limit reset', { identifier, tier });
  }

  /**
   * 모든 Rate Limit 초기화
   */
  resetAll(): void {
    const count = this.buckets.size;
    this.buckets.clear();

    logger.info('All rate limits reset', { bucketsCleared: count });
  }

  /**
   * 버킷 키 생성
   *
   * @param identifier - 식별자
   * @param tier - 사용자 등급
   * @returns 버킷 키
   */
  private getBucketKey(identifier: string, tier: RateLimitTier): string {
    return `${tier}:${identifier}`;
  }

  /**
   * 새 버킷 생성
   *
   * @param policy - Rate Limit 정책
   * @returns 토큰 버킷 상태
   */
  private createBucket(policy: Omit<RateLimitConfig, 'identifier'>): TokenBucketState {
    const now = Date.now();

    return {
      tokens: policy.requests,              // 초기 토큰 = 최대 용량
      lastRefill: now,
      capacity: policy.requests,
      refillRate: policy.requests / policy.window  // tokens per ms
    };
  }

  /**
   * 토큰 리필
   *
   * @param bucket - 토큰 버킷 상태
   * @param policy - Rate Limit 정책
   * @param now - 현재 시간
   */
  private refillTokens(
    bucket: TokenBucketState,
    policy: Omit<RateLimitConfig, 'identifier'>,
    now: number
  ): void {
    const timePassed = now - bucket.lastRefill;

    if (timePassed <= 0) {
      return;
    }

    // 경과 시간 동안 생성된 토큰 수
    const tokensToAdd = timePassed * bucket.refillRate;

    // 토큰 추가 (용량 초과 불가)
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * 리셋 시간 계산
   *
   * @param bucket - 토큰 버킷 상태
   * @param policy - Rate Limit 정책
   * @returns Unix timestamp (초)
   */
  private calculateResetTime(
    bucket: TokenBucketState,
    policy: Omit<RateLimitConfig, 'identifier'>
  ): number {
    // 버킷이 가득 차는 시간
    const tokensNeeded = bucket.capacity - bucket.tokens;
    const timeToFill = tokensNeeded / bucket.refillRate;

    return Math.ceil((bucket.lastRefill + timeToFill) / 1000);
  }

  /**
   * 재시도 가능 시간 계산 (초)
   *
   * @param bucket - 토큰 버킷 상태
   * @param policy - Rate Limit 정책
   * @returns 재시도 가능 시간 (초)
   */
  private calculateRetryAfter(
    bucket: TokenBucketState,
    policy: Omit<RateLimitConfig, 'identifier'>
  ): number {
    // 토큰 1개가 생성되는 시간
    const timeForOneToken = 1 / bucket.refillRate;

    return Math.ceil(timeForOneToken / 1000);
  }

  /**
   * Rate Limit 위반 기록
   *
   * @param identifier - 식별자
   * @param tier - 사용자 등급
   * @param limit - 제한 수
   */
  private recordViolation(
    identifier: string,
    tier: RateLimitTier,
    limit: number
  ): void {
    const violation: RateLimitViolation = {
      identifier,
      tier,
      timestamp: Date.now(),
      attemptedRequests: 1,
      limit
    };

    this.violations.push(violation);

    // 최근 1시간 위반만 유지
    const oneHourAgo = Date.now() - 3600000;
    this.violations = this.violations.filter(v => v.timestamp > oneHourAgo);
  }

  /**
   * Rate Limit 통계 조회
   *
   * @returns 통계 정보
   */
  getStats() {
    const blockRate = this.stats.totalRequests > 0
      ? (this.stats.blocked / this.stats.totalRequests) * 100
      : 0;

    return {
      ...this.stats,
      blockRate: Math.round(blockRate * 100) / 100,
      activeBuckets: this.buckets.size,
      recentViolations: this.violations.length
    };
  }

  /**
   * 특정 식별자의 위반 기록 조회
   *
   * @param identifier - 식별자
   * @returns 위반 기록 배열
   */
  getViolations(identifier?: string): RateLimitViolation[] {
    if (identifier) {
      return this.violations.filter(v => v.identifier === identifier);
    }
    return [...this.violations];
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      allowed: 0,
      blocked: 0,
      violations: 0
    };
    this.violations = [];

    logger.info('Rate limit stats reset');
  }

  /**
   * 오래된 버킷 정리
   *
   * 마지막 리필 후 2시간 이상 지난 버킷 삭제
   */
  private cleanup(): void {
    const twoHoursAgo = Date.now() - 2 * 3600000;
    let cleanedCount = 0;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < twoHoursAgo) {
        this.buckets.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Rate limit buckets cleaned up', {
        removed: cleanedCount,
        remaining: this.buckets.size
      });
    }
  }

  /**
   * 정기 정리 시작
   */
  private startCleanupInterval(): void {
    // 1시간마다 정리
    setInterval(() => {
      this.cleanup();
    }, 3600000);
  }

  /**
   * 모든 활성 버킷 조회 (디버깅용)
   *
   * @returns 버킷 맵
   */
  getBuckets(): Map<string, TokenBucketState> {
    return new Map(this.buckets);
  }
}

/**
 * 전역 Rate Limiter 인스턴스
 */
export const rateLimiter = TokenBucketRateLimiter.getInstance();
