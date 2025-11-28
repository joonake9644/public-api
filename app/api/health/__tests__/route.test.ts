/**
 * Health Check API Integration Tests
 *
 * Tests for /api/health endpoint
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

describe('GET /api/health', () => {
  const baseUrl = 'http://localhost:3000';

  /**
   * Helper function to create NextRequest
   */
  function createRequest(searchParams?: Record<string, string>): NextRequest {
    const url = new URL('/api/health', baseUrl);

    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return new NextRequest(url);
  }

  describe('Basic Health Check', () => {
    it('should return 200 with health status', async () => {
      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('error', null);
      expect(data).toHaveProperty('metadata');
    });

    it('should include timestamp in metadata', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      expect(data.metadata).toHaveProperty('timestamp');
      expect(new Date(data.metadata.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return health status data structure', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      const healthData = data.data;

      expect(healthData).toHaveProperty('status');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('version');
      expect(healthData).toHaveProperty('components');
    });

    it('should check all required components', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      const components = data.data.components;

      expect(components).toHaveProperty('apiKeyManager');
      expect(components).toHaveProperty('rateLimiter');
      expect(components).toHaveProperty('cache');
      expect(components).toHaveProperty('apiClient');
    });

    it('should return valid status for each component', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      const components = data.data.components;

      const validStatuses = ['healthy', 'degraded', 'down'];

      Object.values(components).forEach((component: any) => {
        expect(component).toHaveProperty('status');
        expect(validStatuses).toContain(component.status);
      });
    });
  });

  describe('Detailed Health Check', () => {
    it('should return system info when detailed=true', async () => {
      const request = createRequest({ detailed: 'true' });
      const response = await GET(request);

      const data = await response.json();
      const healthData = data.data;

      expect(healthData).toHaveProperty('system');
      expect(healthData.system).toHaveProperty('memory');
      expect(healthData.system).toHaveProperty('process');
    });

    it('should include memory usage in detailed mode', async () => {
      const request = createRequest({ detailed: 'true' });
      const response = await GET(request);

      const data = await response.json();
      const memory = data.data.system.memory;

      expect(memory).toHaveProperty('used');
      expect(memory).toHaveProperty('total');
      expect(memory).toHaveProperty('percentage');

      expect(memory.used).toBeGreaterThan(0);
      expect(memory.total).toBeGreaterThan(0);
      expect(memory.percentage).toBeGreaterThanOrEqual(0);
      expect(memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should include process info in detailed mode', async () => {
      const request = createRequest({ detailed: 'true' });
      const response = await GET(request);

      const data = await response.json();
      const processInfo = data.data.system.process;

      expect(processInfo).toHaveProperty('pid');
      expect(processInfo).toHaveProperty('uptime');

      expect(processInfo.pid).toBeGreaterThan(0);
      expect(processInfo.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should not include system info when detailed=false', async () => {
      const request = createRequest({ detailed: 'false' });
      const response = await GET(request);

      const data = await response.json();
      expect(data.data).not.toHaveProperty('system');
    });

    it('should not include system info by default', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      expect(data.data).not.toHaveProperty('system');
    });
  });

  describe('Overall Status Logic', () => {
    it('should have valid overall status', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      const status = data.data.status;

      const validStatuses = ['healthy', 'degraded', 'down'];
      expect(validStatuses).toContain(status);
    });

    it('should return 200 for healthy status', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();

      if (data.data.status === 'healthy') {
        expect(response.status).toBe(200);
      }
    });

    it('should return 503 for down status', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();

      if (data.data.status === 'down') {
        expect(response.status).toBe(503);
      }
    });
  });

  describe('Component Stats', () => {
    it('should include stats for healthy components', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      const components = data.data.components;

      // At least one component should have stats
      const hasStats = Object.values(components).some((component: any) =>
        component.stats !== undefined
      );

      expect(hasStats).toBe(true);
    });

    it('should include message for degraded/down components', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      const components = data.data.components;

      Object.values(components).forEach((component: any) => {
        if (component.status === 'degraded' || component.status === 'down') {
          expect(component).toHaveProperty('message');
          expect(typeof component.message).toBe('string');
        }
      });
    });
  });

  describe('Validation', () => {
    it('should reject invalid detailed parameter', async () => {
      const request = createRequest({ detailed: 'invalid' });
      const response = await GET(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Response Headers', () => {
    it('should include no-cache headers', async () => {
      const request = createRequest();
      const response = await GET(request);

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('Response Time', () => {
    it('should respond within reasonable time (< 1000ms)', async () => {
      const startTime = Date.now();
      const request = createRequest();
      await GET(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Uptime', () => {
    it('should report increasing uptime', async () => {
      const request1 = createRequest();
      const response1 = await GET(request1);
      const data1 = await response1.json();
      const uptime1 = data1.data.uptime;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const request2 = createRequest();
      const response2 = await GET(request2);
      const data2 = await response2.json();
      const uptime2 = data2.data.uptime;

      expect(uptime2).toBeGreaterThanOrEqual(uptime1);
    });
  });

  describe('Version', () => {
    it('should include version number', async () => {
      const request = createRequest();
      const response = await GET(request);

      const data = await response.json();
      expect(data.data).toHaveProperty('version');
      expect(typeof data.data.version).toBe('string');
      expect(data.data.version.length).toBeGreaterThan(0);
    });
  });
});
