/**
 * Health Check API 엔드포인트
 *
 * 시스템 상태 모니터링 및 진단
 * - 핵심 컴포넌트 상태 확인
 * - 통계 정보 조회
 * - 외부 의존성 체크
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiKeyManager } from '@/src/lib/auth/ApiKeyManager';
import { rateLimiter } from '@/src/lib/rateLimit';
import { lruCache } from '@/src/lib/cache';
import { publicDataClient } from '@/src/lib/api';
import { logger } from '@/src/lib/utils/logger';
import { z } from 'zod';

/**
 * Health Check 요청 스키마
 */
const HealthCheckSchema = z.object({
  detailed: z.enum(['true', 'false']).optional().transform(val => val === 'true')
});

/**
 * 시스템 상태 타입
 */
type SystemStatus = 'healthy' | 'degraded' | 'down';

/**
 * 컴포넌트 상태 인터페이스
 */
interface ComponentStatus {
  status: SystemStatus;
  message?: string;
  stats?: Record<string, unknown>;
}

/**
 * Health Check 응답 인터페이스
 */
interface HealthCheckResponse {
  status: SystemStatus;
  timestamp: string;
  uptime: number;
  version: string;
  components: {
    apiKeyManager: ComponentStatus;
    rateLimiter: ComponentStatus;
    cache: ComponentStatus;
    apiClient: ComponentStatus;
  };
  system?: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    process: {
      pid: number;
      uptime: number;
    };
  };
}

/**
 * 서버 시작 시간 (uptime 계산용)
 */
const serverStartTime = Date.now();

/**
 * GET /api/health
 *
 * 시스템 Health Check 엔드포인트
 *
 * @query detailed - 상세 정보 포함 여부 (기본값: false)
 *
 * @example
 * GET /api/health
 * GET /api/health?detailed=true
 *
 * @returns {HealthCheckResponse} Health check 결과
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 요청 파라미터 검증
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      detailed: searchParams.get('detailed') ?? undefined
    };

    const validationResult = HealthCheckSchema.safeParse(rawParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '요청 파라미터가 올바르지 않습니다',
            details: validationResult.error.errors
          },
          data: null,
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    const params = validationResult.data;

    // 2. API Key Manager 상태 확인
    const apiKeyStatus = checkApiKeyManager();

    // 3. Rate Limiter 상태 확인
    const rateLimiterStatus = checkRateLimiter();

    // 4. Cache 상태 확인
    const cacheStatus = checkCache();

    // 5. API Client 상태 확인
    const apiClientStatus = checkApiClient();

    // 6. 전체 시스템 상태 결정
    const overallStatus = determineOverallStatus([
      apiKeyStatus,
      rateLimiterStatus,
      cacheStatus,
      apiClientStatus
    ]);

    // 7. 응답 데이터 구성
    const uptime = Date.now() - serverStartTime;

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000), // 초 단위
      version: process.env.npm_package_version || '0.1.0',
      components: {
        apiKeyManager: apiKeyStatus,
        rateLimiter: rateLimiterStatus,
        cache: cacheStatus,
        apiClient: apiClientStatus
      }
    };

    // 8. 상세 정보 추가 (옵션)
    if (params.detailed) {
      const memoryUsage = process.memoryUsage();

      response.system = {
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        process: {
          pid: process.pid,
          uptime: Math.floor(process.uptime())
        }
      };
    }

    // 9. 로깅
    logger.info('Health check completed', {
      status: overallStatus,
      uptime: response.uptime,
      detailed: params.detailed
    });

    // 10. HTTP 상태 코드 결정
    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(
      {
        success: true,
        data: response,
        error: null,
        metadata: {
          timestamp: new Date().toISOString()
        }
      },
      {
        status: httpStatus,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );

  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Health check 실행 중 오류가 발생했습니다',
          retryable: true
        },
        data: null,
        metadata: {
          timestamp: new Date().toISOString()
        }
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
}

/**
 * API Key Manager 상태 확인
 */
function checkApiKeyManager(): ComponentStatus {
  try {
    const stats = apiKeyManager.getStats();

    // 활성 키가 없으면 down
    if (stats.activeKeys === 0) {
      return {
        status: 'down',
        message: '활성화된 API 키가 없습니다',
        stats
      };
    }

    // 만료 예정 키가 있으면 degraded
    if (stats.expiringSoon > 0) {
      return {
        status: 'degraded',
        message: `${stats.expiringSoon}개의 키가 만료 예정입니다`,
        stats
      };
    }

    return {
      status: 'healthy',
      stats
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Rate Limiter 상태 확인
 */
function checkRateLimiter(): ComponentStatus {
  try {
    const stats = rateLimiter.getStats();

    // Block rate가 50% 이상이면 degraded
    if (stats.blockRate > 50) {
      return {
        status: 'degraded',
        message: `Rate limit block rate가 높습니다 (${stats.blockRate}%)`,
        stats
      };
    }

    return {
      status: 'healthy',
      stats
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Cache 상태 확인
 */
function checkCache(): ComponentStatus {
  try {
    const stats = lruCache.getStats();
    const memoryUsage = lruCache.getMemoryUsage();

    // 메모리 사용량이 90% 이상이면 degraded
    if (memoryUsage.percentage > 90) {
      return {
        status: 'degraded',
        message: `캐시 메모리 사용량이 높습니다 (${Math.round(memoryUsage.percentage)}%)`,
        stats: {
          ...stats,
          memory: memoryUsage
        }
      };
    }

    return {
      status: 'healthy',
      stats: {
        ...stats,
        memory: memoryUsage
      }
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * API Client 상태 확인
 */
function checkApiClient(): ComponentStatus {
  try {
    const stats = publicDataClient.getStats();

    // Success rate가 70% 미만이면 degraded
    if (stats.totalRequests > 0 && stats.successRate < 70) {
      return {
        status: 'degraded',
        message: `API 성공률이 낮습니다 (${stats.successRate}%)`,
        stats
      };
    }

    return {
      status: 'healthy',
      stats
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 전체 시스템 상태 결정
 *
 * @param statuses - 컴포넌트 상태 배열
 * @returns 전체 시스템 상태
 */
function determineOverallStatus(statuses: ComponentStatus[]): SystemStatus {
  // 하나라도 down이면 전체 down
  if (statuses.some(s => s.status === 'down')) {
    return 'down';
  }

  // 하나라도 degraded면 전체 degraded
  if (statuses.some(s => s.status === 'degraded')) {
    return 'degraded';
  }

  return 'healthy';
}
