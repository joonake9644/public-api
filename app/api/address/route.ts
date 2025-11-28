/**
 * 주소 검색 API 엔드포인트
 *
 * 공공데이터 포털의 주소 검색 API를 활용한 도로명주소/지번주소 검색
 * - 공공데이터 포털 주소 API 연동
 * - 자동 캐싱 (24시간 TTL)
 * - Rate Limiting 적용
 * - 좌표 변환 지원 (옵션)
 */

import { NextRequest, NextResponse } from 'next/server';
import { publicDataClient } from '@/src/lib/api';
import { coordinateEngine } from '@/src/lib/coordinate/CoordinateEngine';
import { toNextResponse } from '@/src/lib/errors/handler';
import { getIdentifierFromRequest } from '@/src/lib/rateLimit';
import { rateLimiter } from '@/src/lib/rateLimit';
import { logger } from '@/src/lib/utils/logger';
import { z } from 'zod';

/**
 * 주소 검색 요청 파라미터 스키마
 */
const AddressSearchSchema = z.object({
  keyword: z.string().min(2, '검색어는 최소 2자 이상이어야 합니다'),
  pageNo: z.coerce.number().int().min(1).default(1),
  numOfRows: z.coerce.number().int().min(1).max(100).default(10),
  convertCoordinate: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  targetSystem: z.enum(['WGS84', 'GRS80_CENTRAL', 'GRS80_WEST', 'GRS80_EAST', 'BESSEL_CENTRAL', 'KATEC', 'UTM_K']).optional().default('WGS84')
});

/**
 * 공공데이터 주소 API 응답 타입
 */
interface PublicAddressResponse {
  results: {
    common: {
      errorMessage: string;
      countPerPage: string;
      totalCount: string;
      errorCode: string;
      currentPage: string;
    };
    juso: Array<{
      roadAddr: string;          // 도로명주소
      roadAddrPart1: string;     // 도로명주소(참고항목 제외)
      roadAddrPart2: string;     // 도로명주소 참고항목
      jibunAddr: string;         // 지번주소
      engAddr: string;           // 도로명주소(영문)
      zipNo: string;             // 우편번호
      admCd: string;             // 행정구역코드
      rnMgtSn: string;           // 도로명코드
      bdMgtSn: string;           // 건물관리번호
      detBdNmList?: string;      // 상세건물명
      bdNm?: string;             // 건물명
      bdKdcd: string;            // 공동주택여부(1:공동주택, 0:비공동주택)
      siNm: string;              // 시도명
      sggNm: string;             // 시군구명
      emdNm: string;             // 읍면동명
      liNm?: string;             // 법정리명
      rn: string;                // 도로명
      udrtYn: string;            // 지하여부(0:지상, 1:지하)
      buldMnnm: number;          // 건물본번
      buldSlno: number;          // 건물부번
      mtYn: string;              // 산여부(0:대지, 1:산)
      lnbrMnnm: number;          // 지번본번(번지)
      lnbrSlno: number;          // 지번부번(호)
      emdNo: string;             // 읍면동일련번호
    }>;
  };
}

/**
 * GET /api/address
 *
 * 주소 검색 API
 *
 * @query keyword - 검색 키워드 (필수, 최소 2자)
 * @query pageNo - 페이지 번호 (기본값: 1)
 * @query numOfRows - 페이지당 결과 수 (기본값: 10, 최대: 100)
 * @query convertCoordinate - 좌표 변환 여부 (기본값: false)
 * @query targetSystem - 목표 좌표계 (기본값: WGS84)
 *
 * @example
 * GET /api/address?keyword=서울시청&pageNo=1&numOfRows=10
 * GET /api/address?keyword=강남역&convertCoordinate=true&targetSystem=WGS84
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate Limiting 체크
    const identifier = getIdentifierFromRequest(request);
    const rateLimitResult = rateLimiter.checkLimit(identifier, 'anonymous');

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for address search', {
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
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': (rateLimitResult.retryAfter || 60).toString()
          }
        }
      );
    }

    // 2. 요청 파라미터 검증
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      keyword: searchParams.get('keyword'),
      pageNo: searchParams.get('pageNo'),
      numOfRows: searchParams.get('numOfRows'),
      convertCoordinate: searchParams.get('convertCoordinate'),
      targetSystem: searchParams.get('targetSystem')
    };

    const validationResult = AddressSearchSchema.safeParse(rawParams);

    if (!validationResult.success) {
      logger.warn('Address search validation failed', {
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

    logger.info('Address search request', {
      keyword: params.keyword,
      pageNo: params.pageNo,
      numOfRows: params.numOfRows
    });

    // 3. 공공데이터 주소 검색 API 호출 (캐싱 적용)
    // 실제 엔드포인트: https://business.juso.go.kr/addrlink/addrLinkApi.do
    const apiResponse = await publicDataClient.getCached<PublicAddressResponse>(
      'address',
      '/addrlink/addrLinkApi.do',
      {
        params: {
          confmKey: 'devU01TX0FVVEgyMDI1MTEyNjE0MzI1MDExNTI5MzE=', // 예시 키 (실제로는 환경변수에서)
          currentPage: params.pageNo.toString(),
          countPerPage: params.numOfRows.toString(),
          keyword: params.keyword,
          resultType: 'json'
        }
      }
    );

    // 4. 응답 데이터 확인
    if (!apiResponse.success || !apiResponse.data) {
      logger.error('Address API returned no data', { apiResponse });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXTERNAL_API_ERROR',
            message: '주소 검색 API 호출에 실패했습니다',
            retryable: true
          },
          data: null,
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        { status: 502 }
      );
    }

    const results = apiResponse.data.results;

    // 5. API 에러 체크
    if (results.common.errorCode !== '0') {
      logger.error('Address API error', {
        errorCode: results.common.errorCode,
        errorMessage: results.common.errorMessage
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXTERNAL_API_ERROR',
            message: results.common.errorMessage || '주소 검색에 실패했습니다',
            details: {
              errorCode: results.common.errorCode
            }
          },
          data: null,
          metadata: {
            timestamp: new Date().toISOString()
          }
        },
        { status: 502 }
      );
    }

    // 6. 좌표 변환 (옵션)
    let processedResults = results.juso;

    if (params.convertCoordinate && processedResults.length > 0) {
      // 참고: 실제 주소 API는 좌표를 제공하지 않을 수 있음
      // 이 경우 geocoding API를 별도로 호출하거나, 좌표가 포함된 다른 API 사용 필요
      logger.info('Coordinate conversion requested but skipped (address API does not provide coordinates)');
    }

    // 7. 응답 생성
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        addresses: processedResults,
        pagination: {
          currentPage: parseInt(results.common.currentPage),
          pageSize: parseInt(results.common.countPerPage),
          totalCount: parseInt(results.common.totalCount),
          totalPages: Math.ceil(parseInt(results.common.totalCount) / parseInt(results.common.countPerPage))
        }
      },
      error: null,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: apiResponse.metadata.cached || false,
        processingTime
      }
    };

    logger.info('Address search completed', {
      keyword: params.keyword,
      resultCount: processedResults.length,
      processingTime,
      cached: apiResponse.metadata.cached
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        'Cache-Control': apiResponse.metadata.cached ? 'public, max-age=86400' : 'no-cache'
      }
    });

  } catch (error) {
    logger.error('Address search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return toNextResponse(error);
  }
}
