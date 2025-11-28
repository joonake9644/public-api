/**
 * 에러 시스템 통합 Export
 */

// 에러 클래스
export {
  AppError,
  AuthenticationError,
  APIKeyError,
  AuthorizationError,
  ValidationError,
  SchemaValidationError,
  NotFoundError,
  RateLimitError,
  ExternalAPIError,
  TimeoutError,
  ServiceUnavailableError,
  InternalServerError,
  CoordinateError,
  CacheError,
  DatabaseError,
  ConfigurationError,
  isAppError,
  isRetryableError,
  getErrorStatusCode,
  getErrorCode
} from './classes';

// 에러 핸들러
export {
  toErrorInfo,
  toAPIResponse,
  toNextResponse,
  handleError,
  handleAxiosError,
  canRetry,
  getRetryDelay,
  maskError,
  trackError
} from './handler';
