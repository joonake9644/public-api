/**
 * 좌표계 변환 엔진
 *
 * proj4 기반 한국 좌표계 변환 시스템
 */

import proj4 from 'proj4';
import { logger } from '@/src/lib/utils';
import { COORDINATE_SYSTEMS } from './systems';
import type {
  CoordinateSystemCode,
  Point,
  GeoPoint,
  ProjectedPoint,
  CoordinateTransformResult,
  CoordinateValidationResult,
  CoordinateSystemBounds
} from '@/src/lib/types';
import { COORDINATE_SYSTEM_BOUNDS } from '@/src/lib/types';

/**
 * 좌표 변환 엔진 클래스 (Singleton)
 */
export class CoordinateEngine {
  private static instance: CoordinateEngine;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  /**
   * Singleton 인스턴스 반환
   */
  static getInstance(): CoordinateEngine {
    if (!CoordinateEngine.instance) {
      CoordinateEngine.instance = new CoordinateEngine();
    }
    return CoordinateEngine.instance;
  }

  /**
   * 좌표계 초기화 (proj4 정의 등록)
   */
  private initialize(): void {
    if (this.initialized) return;

    try {
      // proj4에 모든 좌표계 정의 등록
      Object.entries(COORDINATE_SYSTEMS).forEach(([key, system]) => {
        proj4.defs(system.epsg, system.proj4);
        logger.debug(`Registered coordinate system: ${key} (${system.epsg})`);
      });

      this.initialized = true;
      logger.info('Coordinate Engine initialized', {
        systemCount: Object.keys(COORDINATE_SYSTEMS).length
      });
    } catch (error) {
      logger.error('Failed to initialize Coordinate Engine', {}, error as Error);
      throw error;
    }
  }

  /**
   * 지원하는 좌표계 목록 반환
   *
   * @returns 지원하는 좌표계 코드 배열
   */
  getSupportedSystems(): CoordinateSystemCode[] {
    return Object.keys(COORDINATE_SYSTEMS) as CoordinateSystemCode[];
  }

  /**
   * 좌표 유효성 검증 (boolean 반환)
   *
   * @param point - 검증할 좌표
   * @param system - 좌표계
   * @returns 유효 여부
   */
  isValidPoint(point: Point, system: CoordinateSystemCode): boolean {
    try {
      this.validatePoint(point, system);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 좌표를 {x, y} 형식으로 정규화
   *
   * @param point - 정규화할 좌표
   * @returns {x, y} 형식의 좌표
   */
  normalizePoint(point: Point): ProjectedPoint {
    if ('longitude' in point && 'latitude' in point) {
      const geo = point as GeoPoint;
      return {
        x: geo.longitude,
        y: geo.latitude
      };
    }
    return point as ProjectedPoint;
  }

  /**
   * 좌표 변환
   *
   * @param point - 변환할 좌표
   * @param from - 원본 좌표계
   * @param to - 대상 좌표계 (기본값: WGS84)
   * @returns 변환된 좌표
   */
  transform(
    point: Point,
    from: CoordinateSystemCode,
    to: CoordinateSystemCode = 'WGS84'
  ): Point {
    try {
      // 1. 좌표계 정보 가져오기
      const fromSystem = COORDINATE_SYSTEMS[from];
      const toSystem = COORDINATE_SYSTEMS[to];

      if (!fromSystem || !toSystem) {
        throw new CoordinateError(`Invalid coordinate system: ${from} or ${to}`);
      }

      // 2. 같은 좌표계면 정규화하여 반환 (일관성 유지)
      if (from === to) {
        logger.debug('Same coordinate system, returning normalized point');
        return this.normalizePoint(point);
      }

      // 3. 입력 검증
      this.validatePoint(point, from);

      // 4. proj4 변환
      const inputArray = this.pointToArray(point);
      const outputArray = proj4(fromSystem.epsg, toSystem.epsg, inputArray);

      // 5. 결과 생성 및 검증
      const result = this.arrayToPoint(outputArray, toSystem.unit);
      this.validatePoint(result, to);

      // 6. 결과를 {x, y} 형식으로 정규화 (일관성 유지)
      const normalized = this.normalizePoint(result);

      logger.debug('Coordinate transformed successfully', {
        from: fromSystem.name,
        to: toSystem.name,
        input: point,
        output: normalized
      });

      return normalized;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Coordinate transformation failed', {
        from,
        to,
        point,
        error: errorMsg
      });

      throw new CoordinateError(
        `Failed to transform from ${from} to ${to}: ${errorMsg}`,
        { point, from, to }
      );
    }
  }

  /**
   * 배치 변환 (최적화)
   *
   * @param points - 변환할 좌표 배열
   * @param from - 원본 좌표계
   * @param to - 대상 좌표계
   * @returns 변환된 좌표 배열
   */
  transformBatch(
    points: Point[],
    from: CoordinateSystemCode,
    to: CoordinateSystemCode = 'WGS84'
  ): Point[] {
    if (points.length === 0) return [];

    try {
      const fromSystem = COORDINATE_SYSTEMS[from];
      const toSystem = COORDINATE_SYSTEMS[to];

      // proj4 변환 함수 미리 생성 (성능 최적화)
      const converter = proj4(fromSystem.epsg, toSystem.epsg);

      const results = points.map(point => {
        const inputArray = this.pointToArray(point);
        const outputArray = converter.forward(inputArray);
        const result = this.arrayToPoint(outputArray, toSystem.unit);
        // 결과를 {x, y} 형식으로 정규화
        return this.normalizePoint(result);
      });

      logger.debug('Batch transformation completed', {
        from: fromSystem.name,
        to: toSystem.name,
        pointCount: points.length
      });

      return results;
    } catch (error) {
      logger.error('Batch transformation failed', { from, to, count: points.length });
      throw error;
    }
  }

  /**
   * 상세 변환 (메타데이터 포함)
   *
   * @param point - 변환할 좌표
   * @param from - 원본 좌표계
   * @param to - 대상 좌표계
   * @returns 상세 변환 결과
   */
  transformWithMetadata(
    point: Point,
    from: CoordinateSystemCode,
    to: CoordinateSystemCode = 'WGS84'
  ): CoordinateTransformResult {
    const output = this.transform(point, from, to);

    return {
      input: {
        point,
        system: from
      },
      output: {
        point: output,
        system: to
      },
      accuracy: '< 1m'
    };
  }

  /**
   * 좌표계 자동 감지
   *
   * @param point - 감지할 좌표
   * @returns 감지된 좌표계 코드 (null이면 감지 실패)
   */
  detectSystem(point: Point): CoordinateSystemCode | null {
    // GeoPoint인지 확인
    if ('latitude' in point && 'longitude' in point) {
      const geo = point as GeoPoint;

      // WGS84 범위
      if (
        geo.longitude >= -180 && geo.longitude <= 180 &&
        geo.latitude >= -90 && geo.latitude <= 90
      ) {
        return 'WGS84';
      }
    }

    // ProjectedPoint인지 확인
    if ('x' in point && 'y' in point) {
      const proj = point as ProjectedPoint;

      // 각 좌표계의 범위 체크
      for (const [code, bounds] of Object.entries(COORDINATE_SYSTEM_BOUNDS)) {
        if (!bounds) continue;

        if (
          proj.x >= bounds.minX && proj.x <= bounds.maxX &&
          proj.y >= bounds.minY && proj.y <= bounds.maxY
        ) {
          return code as CoordinateSystemCode;
        }
      }
    }

    return null;
  }

  /**
   * 좌표 유효성 검증
   *
   * @param point - 검증할 좌표
   * @param system - 좌표계
   * @returns 검증 결과
   */
  validatePoint(point: Point, system: CoordinateSystemCode): CoordinateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const coordSystem = COORDINATE_SYSTEMS[system];

    if (coordSystem.unit === 'degree') {
      // 경위도 범위 체크
      const geo = point as GeoPoint;

      if (geo.longitude < -180 || geo.longitude > 180) {
        errors.push('Longitude out of range (-180 to 180)');
      }

      if (geo.latitude < -90 || geo.latitude > 90) {
        errors.push('Latitude out of range (-90 to 90)');
      }

      // 한국 영역 체크 (경고)
      if (process.env.STRICT_KOREA_BOUNDS !== 'false') {
        if (
          geo.longitude < 124 || geo.longitude > 132 ||
          geo.latitude < 33 || geo.latitude > 43
        ) {
          warnings.push('Coordinate outside Korea bounds');
        }
      }
    } else {
      // 미터 단위 좌표 체크
      const proj = point as ProjectedPoint;

      if (!isFinite(proj.x) || !isFinite(proj.y)) {
        errors.push('Invalid coordinate values (not finite)');
      }

      // 좌표계별 범위 체크
      const bounds = COORDINATE_SYSTEM_BOUNDS[system];
      if (bounds) {
        if (proj.x < bounds.minX || proj.x > bounds.maxX) {
          warnings.push(`X coordinate outside expected range (${bounds.minX} to ${bounds.maxX})`);
        }

        if (proj.y < bounds.minY || proj.y > bounds.maxY) {
          warnings.push(`Y coordinate outside expected range (${bounds.minY} to ${bounds.maxY})`);
        }
      }
    }

    // 에러가 있으면 throw
    if (errors.length > 0) {
      throw new CoordinateError(errors.join(', '), { point, system });
    }

    // 경고는 로그만
    if (warnings.length > 0) {
      logger.warn('Coordinate validation warnings', { warnings, point, system });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      detectedSystem: this.detectSystem(point) || undefined
    };
  }

  /**
   * Point → Array 변환
   */
  private pointToArray(point: Point): [number, number] {
    if ('latitude' in point && 'longitude' in point) {
      const geo = point as GeoPoint;
      return [geo.longitude, geo.latitude];
    } else {
      const proj = point as ProjectedPoint;
      return [proj.x, proj.y];
    }
  }

  /**
   * Array → Point 변환
   */
  private arrayToPoint(array: [number, number], unit: 'degree' | 'meter'): Point {
    if (unit === 'degree') {
      return {
        longitude: array[0],
        latitude: array[1]
      } as GeoPoint;
    } else {
      return {
        x: array[0],
        y: array[1]
      } as ProjectedPoint;
    }
  }
}

/**
 * 좌표 변환 에러 클래스
 */
export class CoordinateError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'CoordinateError';
  }
}

// Singleton 인스턴스 export
export const coordinateEngine = CoordinateEngine.getInstance();

// Default export
export default CoordinateEngine;
