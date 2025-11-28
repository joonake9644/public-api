/**
 * 타입 정의 통합 Export
 *
 * 모든 타입을 한 곳에서 import 할 수 있도록 통합 export
 */

// API 공통 타입
export type {
  APIResponse,
  ResponseMetadata,
  ErrorInfo,
  RequestConfig,
  PaginationParams,
  PaginatedResponse
} from './api';
export { ERROR_CODES, type ErrorCode } from './api';

// 좌표계 타입
export type {
  CoordinateSystemCode,
  CoordinateSystem,
  GeoPoint,
  ProjectedPoint,
  Point,
  CoordinateTransformRequest,
  CoordinateTransformResult,
  BatchTransformRequest,
  CoordinateValidationResult,
  CoordinateSystemBounds
} from './coordinate';
export { KOREA_BOUNDS, COORDINATE_SYSTEM_BOUNDS } from './coordinate';

// 캐싱 타입
export type {
  CacheQuery,
  CacheType,
  CacheOptions,
  CacheStats,
  CacheEntry,
  LRUCacheConfig,
  RedisCacheConfig,
  CacheInvalidationPattern,
  CacheTier,
  CacheResult
} from './cache';
export { CACHE_TTL_POLICIES } from './cache';

// Rate Limiting 타입
export type {
  RateLimitResult,
  RateLimitConfig,
  RateLimitTier,
  RateLimitStore,
  TokenBucketState,
  RateLimitHeaders,
  RateLimitViolation
} from './rateLimit';
export { RATE_LIMIT_POLICIES } from './rateLimit';

// 공공데이터 API 타입
export type {
  AddressSearchParams,
  AddressResult,
  AddressWithCoordinates,
  ApartmentTradeParams,
  ApartmentTradeResult,
  BuildingInfoParams,
  BuildingInfoResult,
  BusinessRegistrationParams,
  BusinessRegistrationResult,
  PublicDataErrorResponse,
  RegionCode,
  APIKeyInfo,
  APIApprovalStatus
} from './publicData';
export { REGION_CODES, API_APPROVAL_TIMELINE } from './publicData';
