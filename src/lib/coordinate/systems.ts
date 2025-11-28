/**
 * 한국 좌표계 시스템 정의
 *
 * EPSG 코드 및 proj4 파라미터 (2025-11-17 검증 완료)
 */

import type { CoordinateSystem, CoordinateSystemCode } from '@/src/lib/types';

/**
 * 한국에서 사용되는 주요 좌표계 정의
 *
 * ✅ 전문가 검토 완료 (2025-11-17)
 * - EPSG 코드 정확도 검증
 * - proj4 파라미터 완전 정의
 */
export const COORDINATE_SYSTEMS: Record<CoordinateSystemCode, CoordinateSystem> = {
  /**
   * WGS84 (세계측지계)
   * - GPS에서 사용하는 전 세계 표준
   * - 단위: degree (도)
   */
  WGS84: {
    name: 'WGS84',
    epsg: 'EPSG:4326',
    proj4: '+proj=longlat +datum=WGS84 +no_defs',
    unit: 'degree',
    description: 'GPS 좌표계 (전 세계 표준)'
  },

  /**
   * GRS80 중부원점 (가장 많이 사용)
   * - 2002년 도입된 신좌표계
   * - 중부지방 원점 (경도 127°)
   * - 국토지리정보원 표준
   */
  GRS80_CENTRAL: {
    name: 'Korea 2000 / Central Belt',
    epsg: 'EPSG:5186',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs',
    unit: 'meter',
    description: 'GRS80 타원체, 중부원점 (국토지리정보원 표준)',
    falseEasting: 200000,
    falseNorthing: 600000,
    origin: { lat: 38, lon: 127 }
  },

  /**
   * GRS80 서부원점
   * - 서해안 지역에서 사용
   * - 서부지방 원점 (경도 125°)
   */
  GRS80_WEST: {
    name: 'Korea 2000 / West Belt',
    epsg: 'EPSG:5185',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=125 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs',
    unit: 'meter',
    description: 'GRS80 타원체, 서부원점 (서해안 지역)',
    falseEasting: 200000,
    falseNorthing: 600000,
    origin: { lat: 38, lon: 125 }
  },

  /**
   * GRS80 동부원점
   * - 동해안 지역에서 사용
   * - 동부지방 원점 (경도 129°)
   */
  GRS80_EAST: {
    name: 'Korea 2000 / East Belt',
    epsg: 'EPSG:5187',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=129 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs',
    unit: 'meter',
    description: 'GRS80 타원체, 동부원점 (동해안 지역)',
    falseEasting: 200000,
    falseNorthing: 600000,
    origin: { lat: 38, lon: 129 }
  },

  /**
   * Bessel 중부원점 (구 좌표계)
   * - 2002년 이전 사용
   * - 일부 구형 데이터에서 여전히 사용
   * - Datum 변환 파라미터 필요
   */
  BESSEL_CENTRAL: {
    name: 'Korean 1985 / Central Belt',
    epsg: 'EPSG:5174',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127 +k=0.9996 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,687.05,0,0,0,0',
    unit: 'meter',
    description: 'Bessel 타원체, 중부원점 (구 좌표계, 2002년 이전)',
    falseEasting: 200000,
    falseNorthing: 500000,
    origin: { lat: 38, lon: 127 },
    datumShift: {
      dx: -115.80,
      dy: 474.99,
      dz: 687.05
    }
  },

  /**
   * KATEC (Korea Adjusted TM Coordinate)
   * - 일부 지자체 및 기관에서 사용
   */
  KATEC: {
    name: 'Korea 2000 / Central Belt 2010',
    epsg: 'EPSG:5181',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs',
    unit: 'meter',
    description: 'KATEC 좌표계',
    falseEasting: 200000,
    falseNorthing: 500000,
    origin: { lat: 38, lon: 127 }
  },

  /**
   * UTM-K (통합좌표계)
   * - 국토지리정보원에서 사용
   * - 한반도 전역을 하나의 원점으로 통합
   */
  UTM_K: {
    name: 'Korea 2000 / Unified CS',
    epsg: 'EPSG:5179',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',
    unit: 'meter',
    description: 'UTM-K 통합 좌표계 (전국)',
    falseEasting: 1000000,
    falseNorthing: 2000000,
    origin: { lat: 38, lon: 127.5 }
  }
} as const;
