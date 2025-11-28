/**
 * Validator 유틸리티
 *
 * 데이터 검증 및 타입 가드 함수
 */

import { z } from 'zod';
import type { Point, GeoPoint, ProjectedPoint } from '@/src/lib/types';

/**
 * 환경변수 검증
 */
export function validateEnv(): void {
  const required = [
    'PUBLIC_DATA_API_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * API 키 형식 검증
 */
export function validateApiKey(key: string): boolean {
  // 최소 20자 이상의 영문, 숫자, 일부 특수문자
  const regex = /^[a-zA-Z0-9%+/=]{20,}$/;
  return regex.test(key);
}

/**
 * URL 검증
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 이메일 검증
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * 사업자등록번호 검증 (10자리)
 */
export function validateBusinessNumber(number: string): boolean {
  // 숫자만 추출
  const digits = number.replace(/[^0-9]/g, '');

  if (digits.length !== 10) return false;

  // 체크섬 검증
  const checksum = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * checksum[i];
  }

  sum += Math.floor((parseInt(digits[8]) * 5) / 10);
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === parseInt(digits[9]);
}

/**
 * 우편번호 검증 (5자리)
 */
export function validateZipCode(zipCode: string): boolean {
  const regex = /^\d{5}$/;
  return regex.test(zipCode);
}

/**
 * 좌표 범위 검증
 */
export function validateCoordinateRange(point: Point, systemCode: string): boolean {
  if (systemCode === 'WGS84') {
    const geo = point as GeoPoint;
    return (
      geo.longitude >= -180 && geo.longitude <= 180 &&
      geo.latitude >= -90 && geo.latitude <= 90
    );
  }

  if (systemCode === 'GRS80_CENTRAL') {
    const proj = point as ProjectedPoint;
    return (
      proj.x >= 100000 && proj.x <= 300000 &&
      proj.y >= 400000 && proj.y <= 800000
    );
  }

  // 기타 좌표계는 기본 유한성 체크
  const proj = point as ProjectedPoint;
  return isFinite(proj.x) && isFinite(proj.y);
}

/**
 * 한국 영역 내 좌표인지 검증
 */
export function isWithinKorea(point: GeoPoint): boolean {
  return (
    point.longitude >= 124 && point.longitude <= 132 &&
    point.latitude >= 33 && point.latitude <= 43
  );
}

/**
 * 타입 가드: GeoPoint 인지 확인
 */
export function isGeoPoint(point: Point): point is GeoPoint {
  return 'latitude' in point && 'longitude' in point;
}

/**
 * 타입 가드: ProjectedPoint 인지 확인
 */
export function isProjectedPoint(point: Point): point is ProjectedPoint {
  return 'x' in point && 'y' in point;
}

/**
 * null/undefined 체크
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 빈 문자열 체크
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 양수 체크
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && isFinite(value);
}

/**
 * Zod 스키마 검증 헬퍼
 */
export function validateWithSchema<T>(data: unknown, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * 날짜 문자열 검증 (YYYY-MM-DD)
 */
export function validateDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 연월 문자열 검증 (YYYYMM)
 */
export function validateYearMonth(yearMonth: string): boolean {
  const regex = /^\d{6}$/;
  if (!regex.test(yearMonth)) return false;

  const year = parseInt(yearMonth.substring(0, 4));
  const month = parseInt(yearMonth.substring(4, 6));

  return year >= 1900 && year <= 2100 && month >= 1 && month <= 12;
}

/**
 * XSS 방지: HTML 이스케이프
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * SQL Injection 방지: 특수문자 제거
 */
export function sanitizeSQL(input: string): string {
  return input.replace(/['";\\]/g, '');
}

/**
 * Path Traversal 방지
 */
export function sanitizePath(input: string): string {
  return input
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '');
}
