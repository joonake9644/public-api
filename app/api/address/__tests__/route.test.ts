import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

const mockGetCached = vi.fn();
const mockCheckLimit = vi.fn();
const mockGetIdentifierFromRequest = vi.fn(() => '127.0.0.1');
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@/src/lib/api', () => ({
  publicDataClient: {
    getCached: mockGetCached,
  },
}));

vi.mock('@/src/lib/rateLimit', () => ({
  rateLimiter: {
    checkLimit: mockCheckLimit,
  },
  getIdentifierFromRequest: mockGetIdentifierFromRequest,
}));

vi.mock('@/src/lib/utils/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/src/lib/coordinate/CoordinateEngine', () => ({
  coordinateEngine: {
    transform: vi.fn(),
    transformBatch: vi.fn(),
  },
}));

describe('GET /api/address', () => {
  const baseUrl = 'http://localhost:3000';

  const allowResult = {
    allowed: true,
    remaining: 99,
    limit: 100,
    reset: Math.floor(Date.now() / 1000) + 60,
  };

  const createRequest = (search?: Record<string, string>) => {
    const url = new URL('/api/address', baseUrl);
    Object.entries(search ?? {}).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckLimit.mockReturnValue(allowResult);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      limit: 100,
      reset: 1700000000,
      retryAfter: 60,
    });

    const request = createRequest({ keyword: '서울', pageNo: '1', numOfRows: '10' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 400 for invalid params', async () => {
    const request = createRequest(); // missing keyword
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockGetCached).not.toHaveBeenCalled();
  });

  it('returns 502 when external API signals an error', async () => {
    mockGetCached.mockResolvedValue({
      success: true,
      data: {
        results: {
          common: {
            errorMessage: 'Service unavailable',
            countPerPage: '10',
            totalCount: '0',
            errorCode: 'E000',
            currentPage: '1',
          },
          juso: [],
        },
      },
      metadata: { cached: false },
    });

    const request = createRequest({ keyword: '서울시청' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('EXTERNAL_API_ERROR');
  });

  it('returns 200 with address results when successful', async () => {
    mockGetCached.mockResolvedValue({
      success: true,
      data: {
        results: {
          common: {
            errorMessage: '',
            countPerPage: '10',
            totalCount: '1',
            errorCode: '0',
            currentPage: '1',
          },
          juso: [
            {
              roadAddr: '서울특별시 중구 세종대로 110',
              roadAddrPart1: '서울특별시 중구 세종대로 110',
              roadAddrPart2: '',
              jibunAddr: '서울특별시 중구 태평로1가 31',
              engAddr: '110, Sejong-daero, Jung-gu, Seoul',
              zipNo: '04524',
              admCd: '1111011700',
              rnMgtSn: '111104000006',
              bdMgtSn: '1111011700101100000000001',
              detBdNmList: '',
              bdNm: '서울시청',
              bdKdcd: '1',
              siNm: '서울특별시',
              sggNm: '중구',
              emdNm: '태평로1가',
              liNm: '',
              rn: '세종대로',
              udrtYn: '0',
              buldMnnm: 110,
              buldSlno: 0,
              mtYn: '0',
              lnbrMnnm: 31,
              lnbrSlno: 0,
              emdNo: '01',
            },
          ],
        },
      },
      metadata: { cached: false },
    });

    const request = createRequest({ keyword: '서울시청', pageNo: '1', numOfRows: '10' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.addresses).toHaveLength(1);
    expect(body.data.pagination).toEqual({
      currentPage: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    });
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });
});
