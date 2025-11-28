/**
 * Rate Limiting 유틸리티 함수
 *
 * HTTP 헤더 생성 및 Rate Limit 관련 헬퍼 함수
 */

import { RateLimitResult, RateLimitHeaders } from '../types/rateLimit';

/**
 * Rate Limit 결과를 HTTP 헤더로 변환
 *
 * @param result - Rate Limit 결과
 * @returns HTTP 헤더 객체
 *
 * @example
 * ```typescript
 * const result = rateLimiter.checkLimit('192.168.1.1', 'anonymous');
 * const headers = toRateLimitHeaders(result);
 *
 * // Next.js API Route에서 사용
 * return NextResponse.json(data, { headers });
 * ```
 */
export function toRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString()
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Rate Limit 결과를 헤더 객체로 변환 (Record 타입)
 *
 * @param result - Rate Limit 결과
 * @returns 헤더 Record 객체
 */
export function toHeadersRecord(result: RateLimitResult): Record<string, string> {
  const headers = toRateLimitHeaders(result);
  return { ...headers } as Record<string, string>;
}

/**
 * IP 주소에서 식별자 추출
 *
 * @param request - Request 객체 (Next.js 또는 표준 Request)
 * @returns IP 주소 또는 fallback 값
 *
 * @example
 * ```typescript
 * // Next.js API Route
 * export async function GET(request: Request) {
 *   const identifier = getIdentifierFromRequest(request);
 *   const result = rateLimiter.checkLimit(identifier, 'anonymous');
 *   // ...
 * }
 * ```
 */
export function getIdentifierFromRequest(request: Request): string {
  // X-Forwarded-For 헤더에서 IP 추출 (프록시 환경)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // X-Real-IP 헤더에서 IP 추출
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // CF-Connecting-IP (Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  // Fallback: 로컬호스트
  return '127.0.0.1';
}

/**
 * API 키에서 식별자 추출
 *
 * @param request - Request 객체
 * @returns API 키 또는 null
 */
export function getApiKeyFromRequest(request: Request): string | null {
  // Authorization 헤더
  const auth = request.headers.get('authorization');
  if (auth) {
    // Bearer 토큰 형식
    if (auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    return auth;
  }

  // X-API-Key 헤더
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return apiKey;
  }

  return null;
}

/**
 * Rate Limit 에러 메시지 생성
 *
 * @param result - Rate Limit 결과
 * @returns 사용자 친화적인 에러 메시지
 */
export function formatRateLimitError(result: RateLimitResult): string {
  if (result.retryAfter !== undefined) {
    if (result.retryAfter < 60) {
      return `요청 제한을 초과했습니다. ${result.retryAfter}초 후에 다시 시도해주세요.`;
    }

    const minutes = Math.ceil(result.retryAfter / 60);
    return `요청 제한을 초과했습니다. 약 ${minutes}분 후에 다시 시도해주세요.`;
  }

  const resetDate = new Date(result.reset * 1000);
  const resetTimeStr = resetDate.toLocaleTimeString('ko-KR');

  return `요청 제한을 초과했습니다. ${resetTimeStr}에 재설정됩니다.`;
}

/**
 * Rate Limit 정보를 사용자 친화적인 문자열로 변환
 *
 * @param result - Rate Limit 결과
 * @returns 정보 문자열
 */
export function formatRateLimitInfo(result: RateLimitResult): string {
  const percentage = (result.remaining / result.limit) * 100;

  if (percentage > 50) {
    return `남은 요청: ${result.remaining}/${result.limit}`;
  }

  if (percentage > 20) {
    return `남은 요청: ${result.remaining}/${result.limit} (${Math.round(percentage)}%)`;
  }

  return `⚠️ 요청 한도가 얼마 남지 않았습니다: ${result.remaining}/${result.limit}`;
}
