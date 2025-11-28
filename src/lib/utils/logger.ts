/**
 * Logger 유틸리티
 *
 * 구조화된 로깅 시스템 (개발/프로덕션 환경 대응)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * Logger 클래스
 */
class Logger {
  private minLevel: LogLevel;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor() {
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  /**
   * 로그 레벨 확인
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  /**
   * 로그 포맷팅
   */
  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;

    if (process.env.NODE_ENV === 'production') {
      // 프로덕션: JSON 포맷 (구조화)
      return JSON.stringify({
        level,
        message,
        timestamp,
        ...context
      });
    } else {
      // 개발: 읽기 쉬운 포맷
      const levelEmoji = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      };

      let log = `${levelEmoji[level]} [${level.toUpperCase()}] ${timestamp} - ${message}`;

      if (context && Object.keys(context).length > 0) {
        log += `\n  Context: ${JSON.stringify(context, null, 2)}`;
      }

      return log;
    }
  }

  /**
   * 로그 출력
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        if (error) console.warn(error);
        break;
      case 'error':
        console.error(formatted);
        if (error) console.error(error);
        break;
    }
  }

  /**
   * Debug 로그
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Info 로그
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Warning 로그
   */
  warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log('warn', message, context, error);
  }

  /**
   * Error 로그
   */
  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * API 요청 로그
   */
  apiRequest(method: string, url: string, context?: Record<string, unknown>): void {
    this.info(`API Request: ${method} ${url}`, context);
  }

  /**
   * API 응답 로그
   */
  apiResponse(method: string, url: string, status: number, duration: number): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `API Response: ${method} ${url}`, {
      status,
      duration: `${duration}ms`
    });
  }

  /**
   * API 키 마스킹 (보안)
   */
  maskApiKey(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${key.substring(0, 4)}${'*'.repeat(key.length - 4)}`;
  }

  /**
   * 민감 정보 제거
   */
  sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'apiKey',
      'api_key',
      'serviceKey',
      'service_key',
      'token',
      'secret'
    ];

    const sanitized = { ...data };

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}

// Singleton 인스턴스
export const logger = new Logger();

// Default export
export default logger;
