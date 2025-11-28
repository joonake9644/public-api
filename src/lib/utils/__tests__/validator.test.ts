import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  validateEnv,
  validateApiKey,
  validateUrl,
  validateEmail,
  validateBusinessNumber,
  validateZipCode,
  validateCoordinateRange,
  isWithinKorea,
  isGeoPoint,
  isProjectedPoint,
  isDefined,
  isNonEmptyString,
  isPositiveNumber,
  validateWithSchema,
  validateDateString,
  validateYearMonth,
  escapeHtml,
  sanitizeSQL,
  sanitizePath,
} from '../validator';
import type { GeoPoint, ProjectedPoint } from '@/src/lib/types';

describe('validator utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('validates required environment variables', () => {
    process.env.PUBLIC_DATA_API_KEY = 'valid_key_1234567890';
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'firebase_key_123';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'project-id';

    expect(() => validateEnv()).not.toThrow();

    delete process.env.PUBLIC_DATA_API_KEY;
    expect(() => validateEnv()).toThrow(/Missing required environment variables/);
  });

  it('validates API key format', () => {
    expect(validateApiKey('short-key')).toBe(false);
    expect(validateApiKey('ValidAPIKey1234567890==')).toBe(true);
  });

  it('validates common string formats', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('not-a-url')).toBe(false);

    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('invalid@')).toBe(false);

    expect(validateZipCode('12345')).toBe(true);
    expect(validateZipCode('12a45')).toBe(false);
  });

  it('validates business registration numbers using checksum', () => {
    const base = '123456789';
    const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
    const digits = base.split('').map(Number);

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * weights[i];
    }
    sum += Math.floor((digits[8] * 5) / 10);
    const checkDigit = (10 - (sum % 10)) % 10;
    const validNumber = `${base}${checkDigit}`;

    expect(validateBusinessNumber(validNumber)).toBe(true);
    expect(validateBusinessNumber(`${base}0`)).toBe(false);
  });

  it('validates coordinate ranges and type guards', () => {
    const wgsPoint: GeoPoint = { longitude: 127.0, latitude: 37.5 };
    const invalidWgs: GeoPoint = { longitude: 200, latitude: 95 };
    expect(validateCoordinateRange(wgsPoint, 'WGS84')).toBe(true);
    expect(validateCoordinateRange(invalidWgs, 'WGS84')).toBe(false);

    const grsPoint: ProjectedPoint = { x: 200000, y: 600000 };
    expect(validateCoordinateRange(grsPoint, 'GRS80_CENTRAL')).toBe(true);

    const projected: ProjectedPoint = { x: 10, y: 10 };
    expect(isProjectedPoint(projected)).toBe(true);
    expect(isGeoPoint(projected)).toBe(false);
    expect(isGeoPoint(wgsPoint)).toBe(true);
  });

  it('checks korean boundary and primitive guards', () => {
    const seoul: GeoPoint = { longitude: 126.978, latitude: 37.5665 };
    const la: GeoPoint = { longitude: -118.2437, latitude: 34.0522 };
    expect(isWithinKorea(seoul)).toBe(true);
    expect(isWithinKorea(la)).toBe(false);

    expect(isDefined(0)).toBe(true);
    expect(isDefined(null)).toBe(false);
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isPositiveNumber(10)).toBe(true);
    expect(isPositiveNumber(-1)).toBe(false);
  });

  it('validates with zod schema helper', () => {
    const schema = z.object({ id: z.number(), name: z.string() });
    const success = validateWithSchema({ id: 1, name: 'test' }, schema);
    const failure = validateWithSchema({ id: 'a' }, schema);

    expect(success).toEqual({ success: true, data: { id: 1, name: 'test' } });
    expect(failure.success).toBe(false);
    if (!failure.success) {
      expect(failure.errors.issues).toHaveLength(1);
    }
  });

  it('validates date strings', () => {
    expect(validateDateString('2024-12-31')).toBe(true);
    expect(validateDateString('2024-13-01')).toBe(false);

    expect(validateYearMonth('202412')).toBe(true);
    expect(validateYearMonth('202413')).toBe(false);
  });

  it('sanitizes and escapes unsafe strings', () => {
    const html = '<div onload="hack">test&</div>';
    expect(escapeHtml(html)).toBe('&lt;div onload=&quot;hack&quot;&gt;test&amp;&lt;/div&gt;');

    expect(sanitizeSQL(`DROP TABLE users; --`)).toBe('DROP TABLE users --');
    expect(sanitizePath('../secret/../../etc/passwd')).toBe('secretetcpasswd');
  });
});
