/**
 * ApiKeyManager Unit Tests
 *
 * Ensures API 키 로딩, 만료 경고, 통계 계산, 폴백 로직을 검증한다.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type UtilsModule = typeof import('@/src/lib/utils');

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  apiRequest: vi.fn(),
  apiResponse: vi.fn(),
  maskApiKey: vi.fn((key: string) => key),
  sanitize: vi.fn(data => data),
};

vi.mock('@/src/lib/utils', async importOriginal => {
  const actual = await importOriginal<UtilsModule>();
  return {
    ...actual,
    logger: mockLogger as UtilsModule['logger'],
  };
});

describe('ApiKeyManager', () => {
  const realEnv = process.env;

  const setBaseEnv = () => {
    process.env.PUBLIC_DATA_API_KEY = 'primaryKey1234567890ABCDEF';
    process.env.API_KEY_EXPIRY = '2099-12-31';
    process.env.PUBLIC_DATA_ADDRESS_API_KEY = 'addressKey1234567890';
    process.env.PUBLIC_DATA_BUSINESS_API_KEY = 'businessKey1234567890';
    process.env.PUBLIC_DATA_APARTMENT_API_KEY = 'apartmentKey1234567890';
  };

  const loadManager = async () => {
    const module = await import('../ApiKeyManager');
    return module.ApiKeyManager.getInstance();
  };

  const clearLoggerMocks = () => {
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.apiRequest.mockClear();
    mockLogger.apiResponse.mockClear();
    mockLogger.maskApiKey.mockClear();
    mockLogger.sanitize.mockClear();
  };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...realEnv };
    setBaseEnv();
    clearLoggerMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    process.env = realEnv;
    vi.useRealTimers();
  });

  it('loads keys from env variables and returns provider specific keys', async () => {
    const manager = await loadManager();

    expect(manager.getKey()).toBe('primaryKey1234567890ABCDEF');
    expect(manager.getKey('address')).toBe('addressKey1234567890');

    const addressInfo = manager.getKeyInfo('address');
    expect(addressInfo?.provider).toBe('address');
    expect(addressInfo?.status).toBe('active');

    expect(mockLogger.info).toHaveBeenCalledWith(
      'API keys loaded successfully',
      expect.objectContaining({
        keyCount: expect.any(Number),
        providers: expect.arrayContaining(['primary', 'address']),
      }),
    );
  });

  it('falls back to the primary key when provider is missing', async () => {
    const manager = await loadManager();

    const fallbackKey = manager.getKey('unknown-service');
    expect(fallbackKey).toBe('primaryKey1234567890ABCDEF');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Key not found for provider 'unknown-service'"),
      undefined,
    );
  });

  it('throws when the primary key is missing or invalid', async () => {
    delete process.env.PUBLIC_DATA_API_KEY;

    await expect(import('../ApiKeyManager')).rejects.toThrow(
      'PUBLIC_DATA_API_KEY is required in environment variables',
    );

    vi.resetModules();
    setBaseEnv();
    process.env.PUBLIC_DATA_API_KEY = 'short';

    await expect(import('../ApiKeyManager')).rejects.toThrow('Invalid API key format');
  });

  it('reports expiry states and stats through logger', async () => {
    const manager = await loadManager();
    clearLoggerMocks();

    const primary = manager.getKeyInfo('primary');
    const address = manager.getKeyInfo('address');
    const business = manager.getKeyInfo('business');
    const apartment = manager.getKeyInfo('apartment');

    if (!primary || !address || !business || !apartment) {
      throw new Error('Test setup failed: key info missing');
    }

    primary.expiryDate = new Date('2024-12-01T00:00:00.000Z'); // expired
    address.expiryDate = new Date('2025-01-03T00:00:00.000Z'); // urgent (<=7 days)
    business.expiryDate = new Date('2025-01-25T00:00:00.000Z'); // warning (<=30 days)
    // apartment remains active

    manager.checkAllKeysExpiry();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("API key expired for 'primary'"),
      expect.objectContaining({ provider: 'primary' }),
    );

    const warnCalls = mockLogger.warn.mock.calls;
    expect(
      warnCalls.some(
        ([message, context]) =>
          typeof message === 'string' &&
          message.includes('[URGENT]') &&
          context?.provider === 'address',
      ),
    ).toBe(true);
    expect(
      warnCalls.some(
        ([message, context]) =>
          typeof message === 'string' &&
          message.includes('[WARNING]') &&
          context?.provider === 'business',
      ),
    ).toBe(true);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("API key expiring soon for 'business'"),
      expect.objectContaining({ provider: 'business' }),
    );

    const stats = manager.getStats();
    expect(stats).toEqual(
      expect.objectContaining({
        totalKeys: 4,
        activeKeys: 1,
        expiredKeys: 1,
        expiringSoon: 2,
      }),
    );
  });

  it('masks keys by keeping the first 4 characters', async () => {
    const manager = await loadManager();
    const masked = manager.maskKey('ABCDEFGH1234567890');
    expect(masked.startsWith('ABCD')).toBe(true);
    expect(masked.length).toBeGreaterThanOrEqual(8);
  });
});
