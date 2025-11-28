import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as transformGet, POST as transformPost } from '@/app/api/coordinate/transform/route';
import { rateLimiter } from '@/src/lib/rateLimit';
import { lruCache } from '@/src/lib/cache';

describe('Coordinate API integration', () => {
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    rateLimiter.resetAll();
    rateLimiter.resetStats();
    lruCache.clear();
  });

  it('performs single coordinate transform and caches the result', async () => {
    const url = new URL('/api/coordinate/transform', baseUrl);
    url.searchParams.set('from', 'GRS80_CENTRAL');
    url.searchParams.set('to', 'WGS84');
    url.searchParams.set('x', '200000');
    url.searchParams.set('y', '600000');

    const firstResponse = await transformGet(new NextRequest(url));
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.success).toBe(true);
    expect(firstBody.metadata.cached).toBe(false);

    const secondResponse = await transformGet(new NextRequest(url));
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.metadata.cached).toBe(true);
    expect(secondBody.data.transformed).toEqual(firstBody.data.transformed);
  });

  it('performs batch transform via POST', async () => {
    const request = new NextRequest(new URL('/api/coordinate/transform', baseUrl), {
      method: 'POST',
      body: JSON.stringify({
        from: 'GRS80_CENTRAL',
        to: 'WGS84',
        points: [
          { x: 200000, y: 600000 },
          { x: 200100, y: 600100 },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await transformPost(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(2);
    expect(body.data.transformed).toHaveLength(2);
  });
});
