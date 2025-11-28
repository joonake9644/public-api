/**
 * 공공데이터 API 클라이언트
 *
 * 한국 공공데이터 포털 API 호출을 위한 통합 HTTP 클라이언트
 * - axios 기반 HTTP 요청
 * - 자동 재시도 (axios-retry)
 * - API 키 자동 주입
 * - Rate Limiting 통합
 * - 응답 캐싱
 * - XML → JSON 자동 변환
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { apiKeyManager } from '../auth/ApiKeyManager';
import { rateLimiter } from '../rateLimit/TokenBucket';
import { lruCache } from '../cache/LRUCache';
import { logger } from '../utils/logger';
import { handleAxiosError } from '../errors/handler';
import {
  APIResponse,
  RequestConfig,
  ResponseMetadata,
  ERROR_CODES
} from '../types/api';
import { RateLimitError } from '../errors/classes';

/**
 * 공공데이터 API 클라이언트 옵션
 */
export interface PublicDataClientOptions {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  enableRateLimit?: boolean;
  apiKeyProvider?: string;
}

/**
 * API 응답 포맷
 */
export type ResponseFormat = 'json' | 'xml';

/**
 * 공공데이터 API 클라이언트 (Singleton)
 *
 * @example
 * ```typescript
 * const client = PublicDataClient.getInstance();
 *
 * // GET 요청
 * const response = await client.get('/15077586/v1/uddi:41944402-8249-4e45-9e9d-a090.....', {
 *   params: {
 *     pageNo: 1,
 *     numOfRows: 10
 *   }
 * });
 *
 * // 캐싱된 요청
 * const cached = await client.getCached('address', '/api/address', {
 *   params: { keyword: '서울시청' }
 * });
 * ```
 */
export class PublicDataClient {
  private static instance: PublicDataClient;
  private client: AxiosInstance;
  private options: Required<PublicDataClientOptions>;

  // 요청 통계
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cachedRequests: 0,
    rateLimitedRequests: 0
  };

  private constructor(options?: PublicDataClientOptions) {
    // 기본 옵션
    const defaultOptions: Required<PublicDataClientOptions> = {
      baseURL: 'https://apis.data.go.kr',
      timeout: 30000,              // 30초
      maxRetries: 3,
      retryDelay: 1000,            // 1초
      enableCache: true,
      enableRateLimit: true,
      apiKeyProvider: 'primary'
    };

    this.options = { ...defaultOptions, ...options };

    // axios 인스턴스 생성
    this.client = axios.create({
      baseURL: this.options.baseURL,
      timeout: this.options.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/xml'
      }
    });

    // axios-retry 설정
    axiosRetry(this.client, {
      retries: this.options.maxRetries,
      retryDelay: (retryCount) => {
        return retryCount * this.options.retryDelay;
      },
      retryCondition: (error) => {
        // 네트워크 에러, 5xx 에러, 429 에러 재시도
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429 ||
          (error.response?.status ?? 0) >= 500
        );
      },
      onRetry: (retryCount, error, requestConfig) => {
        logger.warn('Retrying API request', {
          retryCount,
          url: requestConfig.url,
          method: requestConfig.method,
          error: error.message
        });
      }
    });

    // 요청 인터셉터: API 키 자동 주입
    this.client.interceptors.request.use(
      (config) => {
        try {
          // API 키 가져오기
          const apiKey = apiKeyManager.getKey(this.options.apiKeyProvider);

          // URL에 serviceKey 파라미터 추가
          if (config.params) {
            config.params.serviceKey = apiKey;
          } else {
            config.params = { serviceKey: apiKey };
          }

          // Rate Limiting 체크
          if (this.options.enableRateLimit) {
            const identifier = this.getRequestIdentifier(config);
            const rateLimitResult = rateLimiter.checkLimit(identifier, 'authenticated');

            if (!rateLimitResult.allowed) {
              this.stats.rateLimitedRequests++;

              logger.warn('Rate limit exceeded', {
                identifier,
                remaining: rateLimitResult.remaining,
                reset: rateLimitResult.reset
              });

              throw new RateLimitError(
                '요청 제한을 초과했습니다',
                rateLimitResult.reset,
                rateLimitResult.remaining
              );
            }
          }

          logger.info('API request', {
            method: config.method?.toUpperCase(),
            url: config.url,
            params: this.sanitizeParams(config.params)
          });

          return config;
        } catch (error) {
          return Promise.reject(error);
        }
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터: 응답 정규화
    this.client.interceptors.response.use(
      (response) => {
        this.stats.successfulRequests++;

        logger.info('API response', {
          status: response.status,
          url: response.config.url,
          cached: false
        });

        return response;
      },
      (error) => {
        this.stats.failedRequests++;

        logger.error('API request failed', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message
        });

        return Promise.reject(error);
      }
    );

    logger.info('Public Data API Client initialized', {
      baseURL: this.options.baseURL,
      timeout: this.options.timeout,
      maxRetries: this.options.maxRetries
    });
  }

  /**
   * Singleton 인스턴스 반환
   */
  static getInstance(options?: PublicDataClientOptions): PublicDataClient {
    if (!PublicDataClient.instance) {
      PublicDataClient.instance = new PublicDataClient(options);
    }
    return PublicDataClient.instance;
  }

  /**
   * GET 요청
   *
   * @param endpoint - API 엔드포인트
   * @param config - 요청 설정
   * @returns API 응답
   */
  async get<T>(endpoint: string, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    this.stats.totalRequests++;

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: 'GET',
        url: endpoint,
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout
      };

      const response = await this.client.request<T>(axiosConfig);

      return this.normalizeResponse<T>(response);
    } catch (error) {
      handleAxiosError(error);
    }
  }

  /**
   * POST 요청
   *
   * @param endpoint - API 엔드포인트
   * @param data - 요청 데이터
   * @param config - 요청 설정
   * @returns API 응답
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    config?: Partial<RequestConfig>
  ): Promise<APIResponse<T>> {
    this.stats.totalRequests++;

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: 'POST',
        url: endpoint,
        data,
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout
      };

      const response = await this.client.request<T>(axiosConfig);

      return this.normalizeResponse<T>(response);
    } catch (error) {
      handleAxiosError(error);
    }
  }

  /**
   * 캐시된 GET 요청
   *
   * @param cacheType - 캐시 타입
   * @param endpoint - API 엔드포인트
   * @param config - 요청 설정
   * @returns API 응답 (캐시에서 또는 API 호출)
   */
  async getCached<T>(
    cacheType: 'address' | 'building' | 'coordinate' | 'realtime' | 'static',
    endpoint: string,
    config?: Partial<RequestConfig>
  ): Promise<APIResponse<T>> {
    if (!this.options.enableCache) {
      return this.get<T>(endpoint, config);
    }

    // 캐시 키 생성
    const cacheKey = this.generateCacheKey(endpoint, config?.params);

    // 캐시 확인
    const cached = lruCache.get<APIResponse<T>>(cacheType, cacheKey);

    if (cached.hit && cached.value) {
      this.stats.cachedRequests++;

      logger.info('Cache hit', {
        type: cacheType,
        key: cacheKey,
        age: cached.age
      });

      // 메타데이터에 캐시 플래그 추가
      return {
        ...cached.value,
        metadata: {
          ...cached.value.metadata,
          cached: true
        }
      };
    }

    // 캐시 미스: API 호출
    logger.info('Cache miss', { type: cacheType, key: cacheKey });

    const response = await this.get<T>(endpoint, config);

    // 캐시에 저장 (성공한 응답만)
    if (response.success) {
      lruCache.set(cacheType, cacheKey, response);
    }

    return response;
  }

  /**
   * 응답 정규화
   *
   * @param response - axios 응답
   * @returns 정규화된 API 응답
   */
  private normalizeResponse<T>(response: AxiosResponse<T>): APIResponse<T> {
    const metadata: ResponseMetadata = {
      timestamp: new Date().toISOString(),
      cached: false
    };

    return {
      success: true,
      data: response.data,
      error: null,
      metadata
    };
  }

  /**
   * 캐시 키 생성
   *
   * @param endpoint - API 엔드포인트
   * @param params - 요청 파라미터
   * @returns 캐시 키
   */
  private generateCacheKey(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return endpoint;
    }

    // 파라미터를 정렬하여 일관된 키 생성
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    return `${endpoint}?${sortedParams}`;
  }

  /**
   * 요청 식별자 생성 (Rate Limiting용)
   *
   * @param config - axios 설정
   * @returns 식별자
   */
  private getRequestIdentifier(config: AxiosRequestConfig): string {
    // API 키를 식별자로 사용
    return config.params?.serviceKey || 'anonymous';
  }

  /**
   * 파라미터 민감정보 제거
   *
   * @param params - 요청 파라미터
   * @returns 민감정보가 제거된 파라미터
   */
  private sanitizeParams(params?: Record<string, unknown>): Record<string, unknown> {
    if (!params) return {};

    const sanitized = { ...params };

    // serviceKey 마스킹
    if (sanitized.serviceKey && typeof sanitized.serviceKey === 'string') {
      sanitized.serviceKey = logger.maskApiKey(sanitized.serviceKey);
    }

    return sanitized;
  }

  /**
   * 통계 조회
   *
   * @returns 요청 통계
   */
  getStats() {
    const cacheHitRate = this.stats.totalRequests > 0
      ? (this.stats.cachedRequests / this.stats.totalRequests) * 100
      : 0;

    const successRate = this.stats.totalRequests > 0
      ? (this.stats.successfulRequests / this.stats.totalRequests) * 100
      : 0;

    return {
      ...this.stats,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      rateLimitedRequests: 0
    };

    logger.info('API client stats reset');
  }

  /**
   * 캐시 무효화
   *
   * @param cacheType - 캐시 타입 (전체 무효화 시 생략)
   */
  invalidateCache(cacheType?: 'address' | 'building' | 'coordinate' | 'realtime' | 'static'): void {
    if (cacheType) {
      const count = lruCache.deleteByType(cacheType);
      logger.info('Cache invalidated', { type: cacheType, count });
    } else {
      lruCache.clear();
      logger.info('All cache invalidated');
    }
  }

  /**
   * Axios 인스턴스 직접 접근 (고급 사용)
   *
   * @returns axios 인스턴스
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

/**
 * 전역 공공데이터 API 클라이언트 인스턴스
 */
export const publicDataClient = PublicDataClient.getInstance();
