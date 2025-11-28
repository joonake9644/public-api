/**
 * 좌표계 변환 타입 정의
 *
 * 한국 좌표계 시스템 및 좌표 변환 관련 타입
 */

/**
 * 좌표계 코드 (EPSG 기반)
 */
export type CoordinateSystemCode =
  | 'WGS84'           // EPSG:4326 - GPS 좌표계
  | 'GRS80_CENTRAL'   // EPSG:5186 - GRS80 중부원점
  | 'GRS80_WEST'      // EPSG:5185 - GRS80 서부원점
  | 'GRS80_EAST'      // EPSG:5187 - GRS80 동부원점
  | 'BESSEL_CENTRAL'  // EPSG:5174 - Bessel 중부원점 (구 좌표계)
  | 'KATEC'           // EPSG:5181 - KATEC 좌표계
  | 'UTM_K';          // EPSG:5179 - UTM-K 통합 좌표계

/**
 * 좌표계 정의
 */
export interface CoordinateSystem {
  name: string;
  epsg: string;
  proj4: string;
  unit: 'degree' | 'meter';
  description: string;
  falseEasting?: number;
  falseNorthing?: number;
  origin?: {
    lat: number;
    lon: number;
  };
  datumShift?: {
    dx: number;
    dy: number;
    dz: number;
  };
}

/**
 * 좌표 포인트 (경위도)
 */
export interface GeoPoint {
  longitude: number;  // 경도 (lon, x)
  latitude: number;   // 위도 (lat, y)
}

/**
 * 좌표 포인트 (투영좌표)
 */
export interface ProjectedPoint {
  x: number;  // 동서 좌표 (미터)
  y: number;  // 남북 좌표 (미터)
}

/**
 * 범용 좌표 포인트
 */
export type Point = GeoPoint | ProjectedPoint;

/**
 * 좌표 변환 요청
 */
export interface CoordinateTransformRequest {
  point: Point;
  from: CoordinateSystemCode;
  to: CoordinateSystemCode;
}

/**
 * 좌표 변환 응답
 */
export interface CoordinateTransformResult {
  input: {
    point: Point;
    system: CoordinateSystemCode;
  };
  output: {
    point: Point;
    system: CoordinateSystemCode;
  };
  accuracy?: string;
}

/**
 * 배치 변환 요청
 */
export interface BatchTransformRequest {
  points: Point[];
  from: CoordinateSystemCode;
  to: CoordinateSystemCode;
}

/**
 * 좌표 유효성 검증 결과
 */
export interface CoordinateValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  detectedSystem?: CoordinateSystemCode;
}

/**
 * 한국 영역 바운딩 박스 (WGS84)
 */
export const KOREA_BOUNDS = {
  minLongitude: 124.0,
  maxLongitude: 132.0,
  minLatitude: 33.0,
  maxLatitude: 43.0
} as const;

/**
 * 좌표계 범위 (검증용)
 */
export interface CoordinateSystemBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * 좌표계별 범위 정의
 */
export const COORDINATE_SYSTEM_BOUNDS: Record<CoordinateSystemCode, CoordinateSystemBounds | null> = {
  WGS84: {
    minX: KOREA_BOUNDS.minLongitude,
    maxX: KOREA_BOUNDS.maxLongitude,
    minY: KOREA_BOUNDS.minLatitude,
    maxY: KOREA_BOUNDS.maxLatitude
  },
  GRS80_CENTRAL: {
    minX: 100000,
    maxX: 300000,
    minY: 400000,
    maxY: 800000
  },
  GRS80_WEST: {
    minX: 100000,
    maxX: 300000,
    minY: 400000,
    maxY: 800000
  },
  GRS80_EAST: {
    minX: 100000,
    maxX: 300000,
    minY: 400000,
    maxY: 800000
  },
  BESSEL_CENTRAL: {
    minX: 100000,
    maxX: 300000,
    minY: 300000,
    maxY: 700000
  },
  KATEC: {
    minX: 100000,
    maxX: 300000,
    minY: 300000,
    maxY: 700000
  },
  UTM_K: {
    minX: 900000,
    maxX: 1100000,
    minY: 1800000,
    maxY: 2200000
  }
};
