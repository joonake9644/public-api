/**
 * API 클라이언트 모듈
 *
 * 공공데이터 API 클라이언트 및 관련 유틸리티 Export
 */

export {
  PublicDataClient,
  publicDataClient,
  type PublicDataClientOptions,
  type ResponseFormat
} from './PublicDataClient';

// 타입 re-export (편의성)
export type {
  APIResponse,
  RequestConfig,
  ResponseMetadata,
  ErrorInfo,
  PaginationParams,
  PaginatedResponse
} from '../types/api';

export { ERROR_CODES } from '../types/api';
