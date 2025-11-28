/**
 * API 공통 타입 정의
 *
 * 모든 API 응답, 에러 처리에 사용되는 공통 타입과 인터페이스
 */

/**
 * API 공통 응답 구조
 */
export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: ErrorInfo | null;
  metadata: ResponseMetadata;
}

/**
 * 응답 메타데이터
 */
export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  cached?: boolean;
  processingTime?: number;
}

/**
 * 에러 정보
 */
export interface ErrorInfo {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

/**
 * 에러 코드 상수
 */
export const ERROR_CODES = {
  // 4xx - 클라이언트 에러
  INVALID_API_KEY: { code: 'AUTH_001', status: 401, message: 'API 키가 유효하지 않습니다' },
  API_KEY_EXPIRED: { code: 'AUTH_002', status: 401, message: 'API 키가 만료되었습니다' },
  RATE_LIMIT_EXCEEDED: { code: 'RATE_001', status: 429, message: '요청 제한을 초과했습니다' },
  INVALID_PARAMETER: { code: 'REQ_001', status: 400, message: '요청 파라미터가 올바르지 않습니다' },
  VALIDATION_ERROR: { code: 'REQ_002', status: 400, message: '데이터 검증에 실패했습니다' },

  // 5xx - 서버 에러
  API_TIMEOUT: { code: 'SYS_001', status: 504, message: 'API 요청 시간이 초과되었습니다', retryable: true },
  SERVICE_UNAVAILABLE: { code: 'SYS_002', status: 503, message: '서비스를 일시적으로 사용할 수 없습니다', retryable: true },
  EXTERNAL_API_ERROR: { code: 'SYS_003', status: 502, message: '외부 API 호출에 실패했습니다', retryable: true },
  INTERNAL_ERROR: { code: 'SYS_004', status: 500, message: '내부 서버 오류가 발생했습니다' }
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * API 요청 설정
 */
export interface RequestConfig {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

/**
 * 페이지네이션 요청
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
