/**
 * 서울교통공사 지하철 혼잡도 API 엔드포인트
 *
 * ODCloud 데이터셋(15071311) 기반 혼잡도 정보를 조회한다.
 * - 캐싱: realtime 타입(5분 TTL)
 * - Rate Limiting 적용
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicDataClient } from '@/src/lib/api';
import { getIdentifierFromRequest, rateLimiter, toHeadersRecord } from '@/src/lib/rateLimit';
import { logger } from '@/src/lib/utils/logger';
import { toNextResponse } from '@/src/lib/errors/handler';

/**
 * ODCloud 기본 응답 포맷 (일반화)
 */
interface OdcloudResponse<T> {
  currentCount?: number;
  matchCount?: number;
  totalCount?: number;
  page?: number;
  perPage?: number;
  data: T[];
}

/**
 * 혼잡도 레코드 (필드 명은 데이터셋 스펙에 따라 달라질 수 있음)
 */
export interface SubwayCongestionRecord {
  [key: string]: unknown;
}

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(2000).default(10),
  returnType: z.enum(['JSON', 'XML']).default('JSON'),
});

const DATASET_ENDPOINT =
  'https://api.odcloud.kr/api/15071311/v1/uddi:daf4624e-d52d-4b09-856b-e1c13749b20e';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const identifier = getIdentifierFromRequest(request);
    const rateResult = rateLimiter.checkLimit(identifier, 'anonymous');

    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: '요청 제한을 초과했습니다.',
            retryable: true,
          },
          data: null,
          metadata: { timestamp: new Date().toISOString() },
        },
        { status: 429, headers: toHeadersRecord(rateResult) },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const parseResult = QuerySchema.safeParse({
      page: searchParams.get('page'),
      perPage: searchParams.get('perPage'),
      returnType: searchParams.get('returnType') ?? 'JSON',
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '요청 파라미터가 올바르지 않습니다.',
            details: parseResult.error.errors,
          },
          data: null,
          metadata: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    const params = parseResult.data;

    const apiResponse = await publicDataClient.getCached<OdcloudResponse<SubwayCongestionRecord>>(
      'realtime',
      DATASET_ENDPOINT,
      {
        params: {
          page: params.page,
          perPage: params.perPage,
          returnType: params.returnType,
        },
        headers: {
          Accept: params.returnType === 'JSON' ? 'application/json' : 'application/xml',
        },
      },
    );

    if (!apiResponse.success || !apiResponse.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXTERNAL_API_ERROR',
            message: '혼잡도 데이터를 불러오지 못했습니다.',
            retryable: true,
          },
          data: null,
          metadata: { timestamp: new Date().toISOString() },
        },
        { status: 502 },
      );
    }

    const processingTime = Date.now() - startedAt;

    logger.info('Subway congestion fetched', {
      page: params.page,
      perPage: params.perPage,
      cached: apiResponse.metadata.cached,
      processingTime,
    });

    return NextResponse.json(
      {
        success: true,
        data: apiResponse.data,
        error: null,
        metadata: {
          timestamp: new Date().toISOString(),
          cached: apiResponse.metadata.cached ?? false,
          processingTime,
        },
      },
      {
        status: 200,
        headers: {
          ...toHeadersRecord(rateResult),
          'Cache-Control': apiResponse.metadata.cached ? 'public, max-age=300' : 'no-cache',
        },
      },
    );
  } catch (error) {
    logger.error('Subway congestion API failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return toNextResponse(error);
  }
}
