/**
 * Helper 유틸리티
 *
 * 범용 헬퍼 함수 (날짜, 문자열, 숫자 등)
 */

/**
 * 날짜 관련 헬퍼
 */

/**
 * 두 날짜 사이의 일수 차이
 */
export function daysDiff(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜 포맷팅 (YYYYMM)
 */
export function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * 날짜 포맷팅 (ISO 8601)
 */
export function formatISO(date: Date): string {
  return date.toISOString();
}

/**
 * Unix timestamp → Date
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Date → Unix timestamp
 */
export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * 문자열 관련 헬퍼
 */

/**
 * 문자열 트림
 */
export function trim(str: string): string {
  return str.trim();
}

/**
 * 문자열 자르기 (말줄임표)
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 카멜케이스 → 스네이크케이스
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 스네이크케이스 → 카멜케이스
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 문자열에서 숫자만 추출
 */
export function extractNumbers(str: string): string {
  return str.replace(/[^0-9]/g, '');
}

/**
 * 전화번호 포맷팅
 */
export function formatPhoneNumber(phone: string): string {
  const numbers = extractNumbers(phone);

  if (numbers.length === 10) {
    // 010-1234-5678
    return numbers.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  }

  if (numbers.length === 11) {
    // 010-1234-5678
    return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }

  return phone;
}

/**
 * 숫자 관련 헬퍼
 */

/**
 * 숫자 포맷팅 (천 단위 콤마)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * 금액 포맷팅 (원 단위)
 */
export function formatCurrency(amount: number): string {
  return `${formatNumber(amount)}원`;
}

/**
 * 백분율 계산
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * 반올림 (소수점 n자리)
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 범위 내 값으로 제한
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 배열 관련 헬퍼
 */

/**
 * 배열 청크 분할
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * 배열 중복 제거
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * 배열 섞기 (Fisher-Yates shuffle)
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * 배열 그룹화
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * 객체 관련 헬퍼
 */

/**
 * 깊은 복사
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 객체 병합 (얕은 복사)
 */
export function merge<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

/**
 * 객체에서 null/undefined 제거
 */
export function omitNullish<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value != null)
  ) as Partial<T>;
}

/**
 * 객체 키 추출
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * 비동기 관련 헬퍼
 */

/**
 * 딜레이 (sleep)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 재시도 로직
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true } = options;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const waitTime = backoff ? delay * Math.pow(2, i) : delay;
      await sleep(waitTime);
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * 타임아웃 래퍼
 */
export function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeout);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * 랜덤 관련 헬퍼
 */

/**
 * 랜덤 정수 생성
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 랜덤 문자열 생성
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * UUID v4 생성 (간단 버전)
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 해시 생성 (간단 버전)
 */
export function simpleHash(str: string): string {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16);
}
