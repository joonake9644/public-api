/**
 * API 인증 키 관리자
 *
 * 공공데이터포털 API 키 관리, 만료 체크, 알림 시스템
 */

import { logger } from '@/src/lib/utils';
import { validateApiKey, isDefined } from '@/src/lib/utils';
import type { APIKeyInfo } from '@/src/lib/types';

/**
 * API 키 관리자 클래스 (Singleton)
 */
export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private keys: Map<string, APIKeyInfo>;

  private constructor() {
    this.keys = new Map();
    this.loadKeys();
  }

  /**
   * Singleton 인스턴스 반환
   */
  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  /**
   * 환경변수에서 API 키 로드
   */
  private loadKeys(): void {
    try {
      // 기본 API 키 (필수)
      const primaryKey = process.env.PUBLIC_DATA_API_KEY;
      const expiryDateStr = process.env.API_KEY_EXPIRY;

      if (!primaryKey) {
        throw new Error('PUBLIC_DATA_API_KEY is required in environment variables');
      }

      // API 키 형식 검증
      if (!validateApiKey(primaryKey)) {
        throw new Error('Invalid API key format');
      }

      // 만료일 파싱
      const expiryDate = expiryDateStr
        ? new Date(expiryDateStr)
        : new Date('2099-12-31');

      // Primary 키 저장
      this.keys.set('primary', {
        key: primaryKey,
        provider: '공공데이터포털',
        expiryDate,
        status: 'active',
        createdAt: new Date()
      });

      // 서비스별 개별 키 로드 (선택)
      this.loadServiceKeys();

      logger.info('API keys loaded successfully', {
        keyCount: this.keys.size,
        providers: Array.from(this.keys.keys())
      });

      // 만료 체크 시작
      this.checkAllKeysExpiry();
    } catch (error) {
      logger.error('Failed to load API keys', {}, error as Error);
      throw error;
    }
  }

  /**
   * 서비스별 개별 키 로드
   */
  private loadServiceKeys(): void {
    const serviceKeys = {
      address: process.env.PUBLIC_DATA_ADDRESS_API_KEY,
      realestate: process.env.PUBLIC_DATA_REALESTATE_API_KEY,
      building: process.env.PUBLIC_DATA_BUILDING_API_KEY,
      apartment: process.env.PUBLIC_DATA_APARTMENT_API_KEY,
      business: process.env.PUBLIC_DATA_BUSINESS_API_KEY,
      subway: process.env.PUBLIC_DATA_SUBWAY_CONGESTION_API_KEY
    };

    for (const [service, key] of Object.entries(serviceKeys)) {
      if (key && isDefined(key)) {
        this.keys.set(service, {
          key,
          provider: service,
          expiryDate: new Date('2099-12-31'),
          status: 'active',
          createdAt: new Date()
        });
      }
    }
  }

  /**
   * API 키 가져오기
   * @param provider - 키 제공자 (기본값: 'primary')
   */
  getKey(provider: string = 'primary'): string {
    const keyInfo = this.keys.get(provider);

    if (!keyInfo) {
      // fallback to primary key
      const primaryKey = this.keys.get('primary');
      if (primaryKey) {
        logger.debug(`Key not found for provider '${provider}', using primary key`);
        return primaryKey.key;
      }

      throw new Error(`API key not found for provider: ${provider}`);
    }

    // 상태 체크
    if (keyInfo.status !== 'active') {
      throw new Error(`API key for '${provider}' is not active: ${keyInfo.status}`);
    }

    // 만료 체크
    if (this.isExpired(keyInfo.expiryDate)) {
      throw new Error(`API key for '${provider}' has expired`);
    }

    // 만료 경고
    if (this.isExpiringSoon(keyInfo.expiryDate)) {
      logger.warn(`API key for '${provider}' is expiring soon`, {
        expiryDate: keyInfo.expiryDate.toISOString(),
        daysRemaining: this.getDaysRemaining(keyInfo.expiryDate)
      });
    }

    // 마지막 사용 시간 업데이트
    keyInfo.lastUsed = new Date();

    return keyInfo.key;
  }

  /**
   * 모든 키 정보 가져오기 (디버깅용)
   */
  getAllKeys(): Map<string, APIKeyInfo> {
    return this.keys;
  }

  /**
   * 키 정보 가져오기
   */
  getKeyInfo(provider: string = 'primary'): APIKeyInfo | undefined {
    return this.keys.get(provider);
  }

  /**
   * 만료 여부 확인
   */
  private isExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  /**
   * 만료 임박 확인 (30일 이내)
   */
  private isExpiringSoon(expiryDate: Date, threshold: number = 30): boolean {
    const daysRemaining = this.getDaysRemaining(expiryDate);
    return daysRemaining > 0 && daysRemaining <= threshold;
  }

  /**
   * 남은 일수 계산
   */
  private getDaysRemaining(expiryDate: Date): number {
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * 모든 키의 만료 체크
   */
  checkAllKeysExpiry(): void {
    logger.debug('Checking API key expiry for all providers');

    for (const [provider, keyInfo] of this.keys.entries()) {
      const daysRemaining = this.getDaysRemaining(keyInfo.expiryDate);

      if (this.isExpired(keyInfo.expiryDate)) {
        logger.error(`API key expired for '${provider}'`, {
          provider,
          expiryDate: keyInfo.expiryDate.toISOString()
        });

        this.sendExpiryAlert(provider, keyInfo, 'EXPIRED');
      } else if (daysRemaining <= 7) {
        logger.warn(`API key expiring very soon for '${provider}'`, {
          provider,
          daysRemaining,
          expiryDate: keyInfo.expiryDate.toISOString()
        });

        this.sendExpiryAlert(provider, keyInfo, 'URGENT');
      } else if (daysRemaining <= 30) {
        logger.info(`API key expiring soon for '${provider}'`, {
          provider,
          daysRemaining,
          expiryDate: keyInfo.expiryDate.toISOString()
        });

        this.sendExpiryAlert(provider, keyInfo, 'WARNING');
      }
    }
  }

  /**
   * 만료 알림 발송
   */
  private sendExpiryAlert(
    provider: string,
    keyInfo: APIKeyInfo,
    level: 'EXPIRED' | 'URGENT' | 'WARNING'
  ): void {
    const daysRemaining = this.getDaysRemaining(keyInfo.expiryDate);

    const alertMessage = {
      EXPIRED: `❌ API 키가 만료되었습니다!`,
      URGENT: `⚠️ API 키가 ${daysRemaining}일 후 만료됩니다 (긴급)`,
      WARNING: `ℹ️ API 키가 ${daysRemaining}일 후 만료됩니다`
    }[level];

    logger.warn(`[${level}] ${alertMessage}`, {
      provider,
      expiryDate: keyInfo.expiryDate.toISOString(),
      daysRemaining
    });

    // TODO: Slack, 이메일 등 외부 알림 시스템 연동
    // 예: sendSlackAlert(alertMessage)
    // 예: sendEmailAlert(alertMessage)
  }

  /**
   * 자동 만료 체크 시작 (Cron)
   * @param intervalMs - 체크 간격 (기본: 24시간)
   */
  startAutoCheck(intervalMs: number = 24 * 60 * 60 * 1000): void {
    logger.info('Starting automatic API key expiry check', {
      intervalMs,
      intervalHours: intervalMs / (60 * 60 * 1000)
    });

    setInterval(() => {
      this.checkAllKeysExpiry();
    }, intervalMs);

    // 즉시 한 번 실행
    this.checkAllKeysExpiry();
  }

  /**
   * API 키 마스킹 (로그용)
   */
  maskKey(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${key.substring(0, 4)}${'*'.repeat(Math.min(key.length - 4, 20))}`;
  }

  /**
   * 키 통계 정보
   */
  getStats(): {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    expiringSoon: number;
  } {
    let activeKeys = 0;
    let expiredKeys = 0;
    let expiringSoon = 0;

    for (const keyInfo of this.keys.values()) {
      if (this.isExpired(keyInfo.expiryDate)) {
        expiredKeys++;
      } else if (this.isExpiringSoon(keyInfo.expiryDate)) {
        expiringSoon++;
      } else {
        activeKeys++;
      }
    }

    return {
      totalKeys: this.keys.size,
      activeKeys,
      expiredKeys,
      expiringSoon
    };
  }
}

// Singleton 인스턴스 export
export const apiKeyManager = ApiKeyManager.getInstance();

// Default export
export default ApiKeyManager;
