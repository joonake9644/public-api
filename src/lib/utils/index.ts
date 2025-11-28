/**
 * 유틸리티 통합 Export
 *
 * 모든 유틸리티 함수를 한 곳에서 import 가능
 */

// Logger
export { logger, default as Logger } from './logger';
export type { LogLevel, LogEntry } from './logger';

// Validator
export {
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
  sanitizePath
} from './validator';

// Helpers
export {
  // 날짜
  daysDiff,
  formatDate,
  formatYearMonth,
  formatISO,
  fromUnixTimestamp,
  toUnixTimestamp,

  // 문자열
  trim,
  truncate,
  camelToSnake,
  snakeToCamel,
  extractNumbers,
  formatPhoneNumber,

  // 숫자
  formatNumber,
  formatCurrency,
  percentage,
  round,
  clamp,

  // 배열
  chunk,
  unique,
  shuffle,
  groupBy,

  // 객체
  deepClone,
  merge,
  omitNullish,
  pick,

  // 비동기
  sleep,
  retry,
  withTimeout,

  // 랜덤
  randomInt,
  randomString,
  generateUUID,
  simpleHash
} from './helpers';
