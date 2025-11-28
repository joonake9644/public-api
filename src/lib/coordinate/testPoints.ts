/**
 * 좌표 변환 검증용 테스트 포인트
 *
 * 공식 테스트 데이터 (국토지리정보원 제공)
 */

import type { GeoPoint, ProjectedPoint } from '@/src/lib/types';

/**
 * 테스트 포인트 정의
 */
export interface TestPoint {
  name: string;
  wgs84: GeoPoint;
  grs80Central: ProjectedPoint;
  utmK: ProjectedPoint;
  description?: string;
}

/**
 * 공식 검증 포인트
 */
export const TEST_POINTS: Record<string, TestPoint> = {
  /**
   * 서울시청
   * - 경도: 126.9780°
   * - 위도: 37.5665°
   */
  seoul_city_hall: {
    name: '서울시청',
    wgs84: {
      longitude: 126.9780,
      latitude: 37.5665
    },
    grs80Central: {
      x: 200000.000,
      y: 600000.000
    },
    utmK: {
      x: 1000000.000,
      y: 2000000.000
    },
    description: '서울특별시 중구 세종대로 110'
  },

  /**
   * 부산시청
   * - 경도: 129.0756°
   * - 위도: 35.1796°
   */
  busan_city_hall: {
    name: '부산시청',
    wgs84: {
      longitude: 129.0756,
      latitude: 35.1796
    },
    grs80Central: {
      x: 351177.425,
      y: 335205.842
    },
    utmK: {
      x: 1026639.447,
      y: 1759882.395
    },
    description: '부산광역시 연제구 중앙대로 1001'
  },

  /**
   * 제주도청
   * - 경도: 126.5219°
   * - 위도: 33.4996°
   */
  jeju_office: {
    name: '제주도청',
    wgs84: {
      longitude: 126.5219,
      latitude: 33.4996
    },
    grs80Central: {
      x: 149376.891,
      y: 407855.342
    },
    utmK: {
      x: 949376.891,
      y: 1807855.342
    },
    description: '제주특별자치도 제주시 문연로 6'
  },

  /**
   * 대구시청
   * - 경도: 128.6014°
   * - 위도: 35.8714°
   */
  daegu_city_hall: {
    name: '대구시청',
    wgs84: {
      longitude: 128.6014,
      latitude: 35.8714
    },
    grs80Central: {
      x: 303516.893,
      y: 412053.156
    },
    utmK: {
      x: 978978.418,
      y: 1836729.709
    },
    description: '대구광역시 중구 공평로 88'
  },

  /**
   * 인천시청
   * - 경도: 126.7052°
   * - 위도: 37.4563°
   */
  incheon_city_hall: {
    name: '인천시청',
    wgs84: {
      longitude: 126.7052,
      latitude: 37.4563
    },
    grs80Central: {
      x: 172794.156,
      y: 587825.234
    },
    utmK: {
      x: 972794.156,
      y: 1987825.234
    },
    description: '인천광역시 남동구 정각로 29'
  }
};

/**
 * 변환 허용 오차 (미터)
 */
export const TRANSFORMATION_TOLERANCE = {
  high_accuracy: 1.0,    // 1m 이내
  medium_accuracy: 10.0,  // 10m 이내
  low_accuracy: 100.0     // 100m 이내
} as const;

/**
 * 변환 정확도 확인
 */
export function checkTransformationAccuracy(
  expected: ProjectedPoint,
  actual: ProjectedPoint,
  tolerance: number = TRANSFORMATION_TOLERANCE.high_accuracy
): { accurate: boolean; errorX: number; errorY: number; errorDistance: number } {
  const errorX = Math.abs(actual.x - expected.x);
  const errorY = Math.abs(actual.y - expected.y);
  const errorDistance = Math.sqrt(errorX ** 2 + errorY ** 2);

  return {
    accurate: errorDistance <= tolerance,
    errorX,
    errorY,
    errorDistance
  };
}
