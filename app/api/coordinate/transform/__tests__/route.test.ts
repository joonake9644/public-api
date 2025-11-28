import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

const mockCheckLimit = vi.fn();
const mockToHeadersRecord = vi.fn(() => ({
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '99',
  'X-RateLimit-Reset': `${Math.floor(Date.now() / 1000) + 60}`,
}));
const mockGetIdentifierFromRequest = vi.fn(() => '127.0.0.1');
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
const mockTransform = vi.fn();
const mockTransformBatch = vi.fn();
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/src/lib/rateLimit', () => ({
  rateLimiter: {
    checkLimit: mockCheckLimit,
  },
  toHeadersRecord: mockToHeadersRecord,
  getIdentifierFromRequest: mockGetIdentifierFromRequest,
}));

vi.mock('@/src/lib/cache', () => ({
  lruCache: {
    get: mockCacheGet,
    set: mockCacheSet,
  },
}));

vi.mock('@/src/lib/coordinate/CoordinateEngine', () => ({
  coordinateEngine: {
    transform: mockTransform,
    transformBatch: mockTransformBatch,
  },
}));

vi.mock('@/src/lib/utils/logger', () => ({
  logger: mockLogger,
}));

describe('GET /api/coordinate/transform', () => {
  const baseUrl = 'http://localhost:3000';

  const createRequest = (params: Record<string, string>) => {
    const url = new URL('/api/coordinate/transform', baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
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
    mockCacheGet.mockReturnValue({ hit: false, value: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 429 when rate limited', async () => {
    mockCheckLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      limit: 100,
      reset: Math.floor(Date.now() / 1000),
      retryAfter: 30,
    });

    const request = createRequest({ from: 'WGS84', to: 'GRS80_CENTRAL', x: '127', y: '37' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 400 for invalid params', async () => {
    const request = createRequest({ from: 'WGS84', x: 'abc', y: '37' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns cached result when available', async () => {
    const cachedValue = { x: 100, y: 200 };
    mockCacheGet.mockReturnValue({ hit: true, value: cachedValue });

    const request = createRequest({ from: 'WGS84', to: 'GRS80_CENTRAL', x: '127', y: '37' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.transformed).toEqual(cachedValue);
    expect(body.metadata.cached).toBe(true);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=604800');
    expect(mockTransform).not.toHaveBeenCalled();
  });

  it('transforms and caches when not cached', async () => {
    const transformed = { x: 200000, y: 600000 };
    mockTransform.mockReturnValue(transformed);

    const request = createRequest({ from: 'WGS84', to: 'GRS80_CENTRAL', x: '127', y: '37' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.transformed).toEqual(transformed);
    expect(body.metadata.cached).toBe(false);
    expect(mockCacheSet).toHaveBeenCalled();
  });
});

describe('POST /api/coordinate/transform', () => {
  const baseUrl = 'http://localhost:3000';

  const createPostRequest = (body: unknown) =>
    new NextRequest(new URL('/api/coordinate/transform', baseUrl), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckLimit.mockReturnValue({
      allowed: true,
      remaining: 999,
      limit: 1000,
      reset: Math.floor(Date.now() / 1000) + 60,
    });
  });

  it('returns 429 when rate limit blocks batch requests', async () => {
    mockCheckLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      limit: 1000,
      reset: Math.floor(Date.now() / 1000),
      retryAfter: 120,
    });

    const request = createPostRequest({
      from: 'GRS80_CENTRAL',
      to: 'WGS84',
      points: [{ x: 200000, y: 600000 }],
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 400 for invalid batch payload', async () => {
    const request = createPostRequest({ from: 'GRS80_CENTRAL', points: [] });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns transformed batch results on success', async () => {
    const transformed = [{ x: 127.1, y: 37.5 }];
    mockTransformBatch.mockReturnValue(transformed);

    const request = createPostRequest({
      from: 'GRS80_CENTRAL',
      to: 'WGS84',
      points: [{ x: 200000, y: 600000 }],
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.transformed).toEqual(transformed);
    expect(body.data.count).toBe(1);
  });
});
