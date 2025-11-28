/**
 * 글로벌 에러 핸들러
 *
 * 모든 에러를 일관된 형식으로 처리하고 응답
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/src/lib/utils';
import {
  AppError,
  isAppError,
  getErrorStatusCode,
  getErrorCode,
  SchemaValidationError,
  ExternalAPIError,
  InternalServerError
} from './classes';
import type { APIResponse, ErrorInfo } from '@/src/lib/types';

/**
 * 에러를 ErrorInfo로 변환
 */
export function toErrorInfo(error: unknown): ErrorInfo {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable
    };
  }

  if (error instanceof z.ZodError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.issues,
      retryable: false
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      retryable: false
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    retryable: false
  };
}

/**
 * 에러를 API 응답으로 변환
 */
export function toAPIResponse<T = never>(error: unknown): APIResponse<T> {
  const errorInfo = toErrorInfo(error);

  return {
    success: false,
    data: null,
    error: errorInfo,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * 에러를 Next.js Response로 변환
 */
export function toNextResponse(error: unknown): NextResponse {
  const errorInfo = toErrorInfo(error);
  const statusCode = getErrorStatusCode(error);

  // 로깅
  if (statusCode >= 500) {
    logger.error('Server error occurred', {
      code: errorInfo.code,
      message: errorInfo.message,
      statusCode
    }, error instanceof Error ? error : undefined);
  } else if (statusCode >= 400) {
    logger.warn('Client error occurred', {
      code: errorInfo.code,
      message: errorInfo.message,
      statusCode
    });
  }

  const response: APIResponse<never> = {
    success: false,
    data: null,
    error: errorInfo,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * 글로벌 에러 핸들러 (범용)
 */
export function handleError(error: unknown): {
  error: ErrorInfo;
  statusCode: number;
} {
  // 1. 알려진 AppError 타입
  if (isAppError(error)) {
    logger.error(error.name, {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details
    });

    return {
      error: toErrorInfo(error),
      statusCode: error.statusCode
    };
  }

  // 2. Zod 검증 에러
  if (error instanceof z.ZodError) {
    logger.warn('Validation Error', { issues: error.issues });

    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.issues,
        retryable: false
      },
      statusCode: 400
    };
  }

  // 3. 일반 Error
  if (error instanceof Error) {
    logger.error('Unknown Error', {
      message: error.message,
      stack: error.stack
    });

    // 프로덕션에서는 상세 에러 숨김
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message,
        retryable: false
      },
      statusCode: 500
    };
  }

  // 4. 알 수 없는 에러
  logger.error('Unknown error type', { error: String(error) });

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      retryable: false
    },
    statusCode: 500
  };
}

/**
 * Axios 에러 핸들러
 */
export function handleAxiosError(error: unknown): never {
  // Axios 에러인지 확인
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as unknown as {
      response?: {
        status: number;
        statusText: string;
        data?: unknown;
      };
      code?: string;
      message: string;
    };

    logger.error('Axios Error', {
      url: 'config' in error ? (error.config as { url?: string }).url : undefined,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      code: axiosError.code
    });

    // 상태 코드별 에러 생성
    const status = axiosError.response?.status;

    if (status === 429) {
      throw new ExternalAPIError('Rate limit exceeded from external API', 'Public Data Portal');
    }

    if (status && status >= 500) {
      throw new ExternalAPIError('External API server error', 'Public Data Portal', {
        status,
        statusText: axiosError.response?.statusText
      });
    }

    if (status && status >= 400) {
      throw new ExternalAPIError('External API client error', 'Public Data Portal', {
        status,
        statusText: axiosError.response?.statusText
      });
    }

    // 네트워크 에러
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      throw new ExternalAPIError('Cannot connect to external API', 'Public Data Portal', {
        code: axiosError.code
      });
    }

    // 타임아웃
    if (axiosError.code === 'ECONNABORTED') {
      throw new ExternalAPIError('External API request timeout', 'Public Data Portal');
    }

    throw new ExternalAPIError(axiosError.message, 'Public Data Portal');
  }

  // Axios 에러가 아니면 그대로 throw
  throw error;
}

/**
 * 에러 복구 가능 여부 확인
 */
export function canRetry(error: unknown, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) return false;

  if (isAppError(error)) {
    return error.retryable;
  }

  // Axios 네트워크 에러는 재시도 가능
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code;
    return code === 'ECONNREFUSED' || code === 'ECONNABORTED' || code === 'ETIMEDOUT';
  }

  return false;
}

/**
 * 재시도 지연 계산 (지수 백오프)
 */
export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // 최대 30초
}

/**
 * 프로덕션 에러 마스킹
 */
export function maskError(error: ErrorInfo): ErrorInfo {
  if (process.env.NODE_ENV === 'production') {
    // 프로덕션에서는 내부 에러 상세 정보 제거
    if (error.code.startsWith('INTERNAL_') || error.code === 'UNKNOWN_ERROR') {
      return {
        code: error.code,
        message: 'An unexpected error occurred',
        retryable: error.retryable
      };
    }
  }

  return error;
}

/**
 * 에러 통계 수집 (선택)
 */
export function trackError(error: unknown): void {
  // TODO: Sentry, DataDog 등 에러 추적 시스템 연동
  // Sentry.captureException(error);

  logger.debug('Error tracked', {
    type: error instanceof Error ? error.name : typeof error,
    code: getErrorCode(error)
  });
}
