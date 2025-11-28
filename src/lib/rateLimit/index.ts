/**
 * Rate Limiting 시스템 모듈
 *
 * 토큰 버킷 알고리즘 기반 Rate Limiter 및 유틸리티 Export
 */

export { TokenBucketRateLimiter, rateLimiter } from './TokenBucket';

export {
  toRateLimitHeaders,
  toHeadersRecord,
  getIdentifierFromRequest,
  getApiKeyFromRequest,
  formatRateLimitError,
  formatRateLimitInfo
} from './utils';

// 타입 re-export (편의성)
export type {
  RateLimitResult,
  RateLimitConfig,
  RateLimitTier,
  RateLimitViolation,
  TokenBucketState,
  RateLimitHeaders,
  RateLimitStore
} from '../types/rateLimit';

export { RATE_LIMIT_POLICIES } from '../types/rateLimit';
