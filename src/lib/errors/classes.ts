/**
 * 에러 클래스 계층 구조
 *
 * 애플리케이션의 모든 에러를 계층화하여 관리
 */

/**
 * 기본 애플리케이션 에러
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable
    };
  }
}

/**
 * 인증 에러 (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 'AUTH_ERROR', 401, details, false);
    this.name = 'AuthenticationError';
  }
}

/**
 * API 키 에러
 */
export class APIKeyError extends AuthenticationError {
  constructor(message: string = 'Invalid or expired API key', details?: unknown) {
    super(message, details);
    this.code = 'API_KEY_ERROR';
    this.name = 'APIKeyError';
  }
}

/**
 * 권한 에러 (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied', details?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', 403, details, false);
    this.name = 'AuthorizationError';
  }
}

/**
 * 검증 에러 (400)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details, false);
    this.name = 'ValidationError';
  }
}

/**
 * 데이터 검증 에러 (Zod)
 */
export class SchemaValidationError extends ValidationError {
  constructor(message: string = 'Schema validation failed', public issues?: unknown[]) {
    super(message, { issues });
    this.code = 'SCHEMA_VALIDATION_ERROR';
    this.name = 'SchemaValidationError';
  }
}

/**
 * Not Found 에러 (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 'NOT_FOUND', 404, details, false);
    this.name = 'NotFoundError';
  }
}

/**
 * Rate Limit 에러 (429)
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    public resetTime?: number,
    public remaining?: number
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { resetTime, remaining }, true);
    this.name = 'RateLimitError';
  }
}

/**
 * 외부 API 에러 (502)
 */
export class ExternalAPIError extends AppError {
  constructor(
    message: string = 'External API call failed',
    public provider?: string,
    details?: unknown
  ) {
    const combinedDetails = details && typeof details === 'object'
      ? { provider, ...(details as Record<string, unknown>) }
      : { provider, details };
    super(message, 'EXTERNAL_API_ERROR', 502, combinedDetails, true);
    this.name = 'ExternalAPIError';
  }
}

/**
 * 타임아웃 에러 (504)
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout', public timeoutMs?: number) {
    super(message, 'TIMEOUT_ERROR', 504, { timeoutMs }, true);
    this.name = 'TimeoutError';
  }
}

/**
 * 서비스 unavailable 에러 (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: unknown) {
    super(message, 'SERVICE_UNAVAILABLE', 503, details, true);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * 내부 서버 에러 (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details, false);
    this.name = 'InternalServerError';
  }
}

/**
 * 좌표 변환 에러
 */
export class CoordinateError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'COORDINATE_ERROR', 400, details, false);
    this.name = 'CoordinateError';
  }
}

/**
 * 캐시 에러
 */
export class CacheError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CACHE_ERROR', 500, details, false);
    this.name = 'CacheError';
  }
}

/**
 * 데이터베이스 에러
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', 500, details, true);
    this.name = 'DatabaseError';
  }
}

/**
 * 설정 에러
 */
export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', 500, details, false);
    this.name = 'ConfigurationError';
  }
}

/**
 * 에러 타입 가드
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isRetryableError(error: unknown): boolean {
  return isAppError(error) && error.retryable;
}

export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}

export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}
