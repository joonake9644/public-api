/**
 * 좌표 변환 API 엔드포인트
 *
 * 다양한 좌표계 간의 좌표 변환 서비스
 * - 7개 한국 좌표계 지원 (WGS84, GRS80, Bessel, KATEC, UTM-K)
 * - 단일/배치 변환 지원
 * - 자동 캐싱 (7일 TTL)
 * - Rate Limiting 적용
 */

import { NextRequest, NextResponse } from 'next/server';
import { coordinateEngine } from '@/src/lib/coordinate/CoordinateEngine';
import { toNextResponse } from '@/src/lib/errors/handler';
import { getIdentifierFromRequest } from '@/src/lib/rateLimit';
import { rateLimiter, toHeadersRecord } from '@/src/lib/rateLimit';
import { lruCache } from '@/src/lib/cache';
import { logger } from '@/src/lib/utils/logger';
import { z } from 'zod';
import type { CoordinateSystemCode, Point } from '@/src/lib/types/coordinate';

/**
 * 좌표 포인트 스키마
 */
const PointSchema = z.object({
  x: z.number(),
  y: z.number()
}).or(z.object({
  longitude: z.number(),
  latitude: z.number()
}));

/**
 * 단일 좌표 변환 요청 스키마
 */
const SingleTransformSchema = z.object({
  from: z.enum(['WGS84', 'GRS80_CENTRAL', 'GRS80_WEST', 'GRS80_EAST', 'BESSEL_CENTRAL', 'KATEC', 'UTM_K']),
  to: z.enum(['WGS84', 'GRS80_CENTRAL', 'GRS80_WEST', 'GRS80_EAST', 'BESSEL_CENTRAL', 'KATEC', 'UTM_K']).default('WGS84'),
  point: PointSchema
});

/**
 * 배치 좌표 변환 요청 스키마
 */
const BatchTransformSchema = z.object({
  from: z.enum(['WGS84', 'GRS80_CENTRAL', 'GRS80_WEST', 'GRS80_EAST', 'BESSEL_CENTRAL', 'KATEC', 'UTM_K']),
  to: z.enum(['WGS84', 'GRS80_CENTRAL', 'GRS80_WEST', 'GRS80_EAST', 'BESSEL_CENTRAL', 'KATEC', 'UTM_K']).default('WGS84'),
  points: z.array(PointSchema).min(1).max(100)
});

/**
 * GET /api/coordinate/transform
 *
 * 단일 좌표 변환 (쿼리 파라미터)
 *
 * @query from - 원본 좌표계 (필수)
 * @query to - 목표 좌표계 (기본값: WGS84)
 * @query x - X 좌표 또는 경도 (필수)
 * @query y - Y 좌표 또는 위도 (필수)
 *
 * @example
 * GET /api/coordinate/transform?from=GRS80_CENTRAL&to=WGS84&x=200000&y=600000
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate Limiting 체크
    const identifier = getIdentifierFromRequest(request);
    const rateLimitResult = rateLimiter.checkLimit(identifier, 'anonymous');

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for coordinate transform', {
        identifier,
        remaining: rateLimitResult.remaining
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `요청 제한을 초과했습니다. ${rateLimitResult.retryAfter}초 후에 다시 시도해주세요.`,
            retryable: true
          },
          data: null,
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        {
          status: 429,
          headers: toHeadersRecord(rateLimitResult)
        }
      );
    }

    // 2. 요청 파라미터 추출 및 검증
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      from: searchParams.get('from'),
      to: searchParams.get('to') || 'WGS84',
      point: {
        x: parseFloat(searchParams.get('x') || ''),
        y: parseFloat(searchParams.get('y') || '')
      }
    };

    const validationResult = SingleTransformSchema.safeParse(rawParams);

    if (!validationResult.success) {
      logger.warn('Coordinate transform validation failed', {
        errors: validationResult.error.errors
      });

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

    // 3. 포인트 정규화 (longitude/latitude → x/y)
    const point: Point = 'longitude' in params.point
      ? { x: params.point.longitude, y: params.point.latitude }
      : params.point;

    // 4. 캐시 키 생성
    const cacheKey = `${params.from}-${params.to}-${point.x}-${point.y}`;

    // 5. 캐시 확인
    const cached = lruCache.get<Point>('coordinate', cacheKey);

    if (cached.hit && cached.value) {
      const processingTime = Date.now() - startTime;

      logger.info('Coordinate transform (cached)', {
        from: params.from,
        to: params.to,
        cached: true,
        processingTime
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            original: point,
            transformed: cached.value,
            from: params.from,
            to: params.to
          },
          error: null,
          metadata: {
            timestamp: new Date().toISOString(),
            cached: true,
            processingTime
          }
        },
        {
          status: 200,
          headers: {
            ...toHeadersRecord(rateLimitResult),
            'Cache-Control': 'public, max-age=604800' // 7일
          }
        }
      );
    }

    // 6. 좌표 변환 수행
    logger.info('Coordinate transform request', {
      from: params.from,
      to: params.to,
      point
    });

    const transformed = coordinateEngine.transform(
      point,
      params.from as CoordinateSystemCode,
      params.to as CoordinateSystemCode
    );

    // 6. 결과 캐싱
    lruCache.set('coordinate', cacheKey, transformed);

    // 7. 응답 생성
    const processingTime = Date.now() - startTime;

    logger.info('Coordinate transform completed', {
      from: params.from,
      to: params.to,
      processingTime
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          original: point,
          transformed,
          from: params.from,
          to: params.to
        },
        error: null,
        metadata: {
          timestamp: new Date().toISOString(),
          cached: false,
          processingTime
        }
      },
      {
        status: 200,
        headers: {
          ...toHeadersRecord(rateLimitResult),
          'Cache-Control': 'public, max-age=604800' // 7일
        }
      }
    );

  } catch (error) {
    logger.error('Coordinate transform failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return toNextResponse(error);
  }
}

/**
 * POST /api/coordinate/transform
 *
 * 배치 좌표 변환 (JSON body)
 *
 * @body from - 원본 좌표계 (필수)
 * @body to - 목표 좌표계 (기본값: WGS84)
 * @body points - 좌표 배열 (최소 1개, 최대 100개)
 *
 * @example
 * POST /api/coordinate/transform
 * {
 *   "from": "GRS80_CENTRAL",
 *   "to": "WGS84",
 *   "points": [
 *     { "x": 200000, "y": 600000 },
 *     { "x": 200100, "y": 600100 }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate Limiting 체크 (배치는 더 엄격)
    const identifier = getIdentifierFromRequest(request);
    const rateLimitResult = rateLimiter.checkLimit(identifier, 'authenticated');

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for batch coordinate transform', {
        identifier,
        remaining: rateLimitResult.remaining
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `요청 제한을 초과했습니다. ${rateLimitResult.retryAfter}초 후에 다시 시도해주세요.`,
            retryable: true
          },
          data: null,
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        {
          status: 429,
          headers: toHeadersRecord(rateLimitResult)
        }
      );
    }

    // 2. 요청 본문 파싱 및 검증
    const body = await request.json();
    const validationResult = BatchTransformSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('Batch coordinate transform validation failed', {
        errors: validationResult.error.errors
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '요청 데이터가 올바르지 않습니다',
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

    logger.info('Batch coordinate transform request', {
      from: params.from,
      to: params.to,
      pointCount: params.points.length
    });

    // 3. 배치 좌표 변환 수행
    const transformed = coordinateEngine.transformBatch(
      params.points,
      params.from as CoordinateSystemCode,
      params.to as CoordinateSystemCode
    );

    // 4. 응답 생성
    const processingTime = Date.now() - startTime;

    logger.info('Batch coordinate transform completed', {
      from: params.from,
      to: params.to,
      pointCount: params.points.length,
      processingTime
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          original: params.points,
          transformed,
          from: params.from,
          to: params.to,
          count: transformed.length
        },
        error: null,
        metadata: {
          timestamp: new Date().toISOString(),
          cached: false,
          processingTime
        }
      },
      {
        status: 200,
        headers: toHeadersRecord(rateLimitResult)
      }
    );

  } catch (error) {
    logger.error('Batch coordinate transform failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return toNextResponse(error);
  }
}
