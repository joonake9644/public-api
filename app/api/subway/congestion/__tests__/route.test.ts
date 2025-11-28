import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

const mockGetCached = vi.fn();
const mockCheckLimit = vi.fn();
const mockToHeadersRecord = vi.fn(() => ({
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '99',
  'X-RateLimit-Reset': `${Math.floor(Date.now() / 1000) + 60}`,
}));
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
  toHeadersRecord: mockToHeadersRecord,
  getIdentifierFromRequest: mockGetIdentifierFromRequest,
}));

vi.mock('@/src/lib/utils/logger', () => ({
  logger: mockLogger,
}));

describe('GET /api/subway/congestion', () => {
  const baseUrl = 'http://localhost:3000';

  const createRequest = (query?: Record<string, string>) => {
    const url = new URL('/api/subway/congestion', baseUrl);
    Object.entries(query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    return new NextRequest(url);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckLimit.mockReturnValue({
      allowed: true,
      remaining: 99,
      limit: 100,
      reset: Math.floor(Date.now() / 1000) + 60,
    });
  });

  it('returns 429 when rate limited', async () => {
    mockCheckLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      limit: 100,
      reset: Math.floor(Date.now() / 1000),
      retryAfter: 30,
    });

    const res = await GET(createRequest({ page: '1', perPage: '10' }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 400 on invalid params', async () => {
    const res = await GET(createRequest({ perPage: '0' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 502 when API fails', async () => {
    mockGetCached.mockResolvedValue({
      success: false,
      data: null,
      error: { code: 'EXTERNAL_API_ERROR', message: 'fail' },
      metadata: { cached: false },
    });

    const res = await GET(createRequest({ page: '1', perPage: '10' }));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('EXTERNAL_API_ERROR');
  });

  it('returns data on success', async () => {
    mockGetCached.mockResolvedValue({
      success: true,
      data: {
        data: [{ station: '서울역', congestion: 120 }],
        totalCount: 1,
        currentCount: 1,
      },
      error: null,
      metadata: { cached: false },
    });

    const res = await GET(createRequest({ page: '1', perPage: '5' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.data).toHaveLength(1);
    expect(body.metadata.cached).toBe(false);
  });
});
