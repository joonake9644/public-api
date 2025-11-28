/**
 * CoordinateEngine Unit Tests
 *
 * Tests all coordinate transformation functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CoordinateEngine, CoordinateError } from '../CoordinateEngine';
import type { GeoPoint, ProjectedPoint } from '@/src/lib/types';

describe('CoordinateEngine', () => {
  let engine: CoordinateEngine;

  beforeAll(() => {
    engine = CoordinateEngine.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = CoordinateEngine.getInstance();
      const instance2 = CoordinateEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getSupportedSystems', () => {
    it('should return all supported coordinate systems', () => {
      const systems = engine.getSupportedSystems();
      expect(systems).toContain('WGS84');
      expect(systems).toContain('GRS80_CENTRAL');
      expect(systems).toContain('GRS80_WEST');
      expect(systems).toContain('GRS80_EAST');
      expect(systems).toContain('BESSEL_CENTRAL');
      expect(systems).toContain('KATEC');
      expect(systems).toContain('UTM_K');
      expect(systems.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('normalizePoint', () => {
    it('should convert GeoPoint (longitude/latitude) to ProjectedPoint (x/y)', () => {
      const geoPoint: GeoPoint = {
        longitude: 126.9780,
        latitude: 37.5665
      };

      const normalized = engine.normalizePoint(geoPoint);
      expect(normalized).toHaveProperty('x');
      expect(normalized).toHaveProperty('y');
      expect(normalized.x).toBe(126.9780);
      expect(normalized.y).toBe(37.5665);
    });

    it('should keep ProjectedPoint as is', () => {
      const projPoint: ProjectedPoint = {
        x: 200000,
        y: 600000
      };

      const normalized = engine.normalizePoint(projPoint);
      expect(normalized).toEqual(projPoint);
    });
  });

  describe('isValidPoint', () => {
    it('should return true for valid WGS84 coordinates', () => {
      const validPoint: GeoPoint = {
        longitude: 127.0,
        latitude: 37.5
      };

      expect(engine.isValidPoint(validPoint, 'WGS84')).toBe(true);
    });

    it('should return false for invalid WGS84 coordinates', () => {
      const invalidPoint: GeoPoint = {
        longitude: 200, // Out of range
        latitude: 37.5
      };

      expect(engine.isValidPoint(invalidPoint, 'WGS84')).toBe(false);
    });

    it('should return true for valid GRS80 projected coordinates', () => {
      const validPoint: ProjectedPoint = {
        x: 200000,
        y: 600000
      };

      expect(engine.isValidPoint(validPoint, 'GRS80_CENTRAL')).toBe(true);
    });
  });

  describe('validatePoint', () => {
    it('should validate correct WGS84 coordinates', () => {
      const validPoint: GeoPoint = {
        longitude: 127.0,
        latitude: 37.5
      };

      const result = engine.validatePoint(validPoint, 'WGS84');
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should throw error for longitude out of range', () => {
      const invalidPoint: GeoPoint = {
        longitude: 200, // Out of range (-180 to 180)
        latitude: 37.5
      };

      expect(() => engine.validatePoint(invalidPoint, 'WGS84')).toThrow(CoordinateError);
    });

    it('should throw error for latitude out of range', () => {
      const invalidPoint: GeoPoint = {
        longitude: 127.0,
        latitude: 100 // Out of range (-90 to 90)
      };

      expect(() => engine.validatePoint(invalidPoint, 'WGS84')).toThrow(CoordinateError);
    });

    it('should throw error for non-finite coordinates', () => {
      const invalidPoint: ProjectedPoint = {
        x: NaN,
        y: 600000
      };

      expect(() => engine.validatePoint(invalidPoint, 'GRS80_CENTRAL')).toThrow(CoordinateError);
    });
  });

  describe('detectSystem', () => {
    it('should detect WGS84 from geographic coordinates', () => {
      const wgs84Point: GeoPoint = {
        longitude: 127.0,
        latitude: 37.5
      };

      const detected = engine.detectSystem(wgs84Point);
      expect(detected).toBe('WGS84');
    });

    it('should detect GRS80_CENTRAL from projected coordinates', () => {
      const grs80Point: ProjectedPoint = {
        x: 200000,
        y: 600000
      };

      const detected = engine.detectSystem(grs80Point);
      expect(detected).toBe('GRS80_CENTRAL');
    });

    it('should return null for out-of-bounds coordinates', () => {
      const invalidPoint: ProjectedPoint = {
        x: 999999999,
        y: 999999999
      };

      const detected = engine.detectSystem(invalidPoint);
      expect(detected).toBeNull();
    });
  });

  describe('transform - Single Point', () => {
    it('should return same point when from === to', () => {
      const point: GeoPoint = {
        longitude: 126.9780,
        latitude: 37.5665
      };

      const result = engine.transform(point, 'WGS84', 'WGS84');
      expect(result).toEqual({
        x: point.longitude,
        y: point.latitude
      });
    });

    it('should transform WGS84 to GRS80_CENTRAL (Seoul)', () => {
      const wgs84Point: GeoPoint = {
        longitude: 126.9780,
        latitude: 37.5665
      };

      const result = engine.transform(wgs84Point, 'WGS84', 'GRS80_CENTRAL') as ProjectedPoint;

      // Verify actual proj4 transformation result (verified manually)
      expect(result.x).toBeCloseTo(198056.37, 0); // ±1m tolerance
      expect(result.y).toBeCloseTo(551885.03, 0); // ±1m tolerance
    });

    it('should transform WGS84 to UTM_K (Busan)', () => {
      const wgs84Point: GeoPoint = {
        longitude: 129.0756,
        latitude: 35.1796
      };

      const result = engine.transform(wgs84Point, 'WGS84', 'UTM_K') as ProjectedPoint;

      // Verify actual proj4 transformation result
      expect(result.x).toBeCloseTo(1143467.38, 0); // ±1m tolerance
      expect(result.y).toBeCloseTo(1688281.98, 0); // ±1m tolerance
    });

    it('should support round-trip transformation (WGS84 -> GRS80 -> WGS84)', () => {
      const originalWgs84: GeoPoint = {
        longitude: 127.0,
        latitude: 37.5
      };

      // Forward transformation
      const grs80 = engine.transform(originalWgs84, 'WGS84', 'GRS80_CENTRAL');

      // Backward transformation
      const roundTripWgs84 = engine.transform(grs80, 'GRS80_CENTRAL', 'WGS84') as ProjectedPoint;

      // Round-trip should be very accurate (within 0.000001 degrees ≈ 0.1m)
      expect(roundTripWgs84.x).toBeCloseTo(originalWgs84.longitude, 6);
      expect(roundTripWgs84.y).toBeCloseTo(originalWgs84.latitude, 6);
    });

    it('should throw error for invalid coordinate system', () => {
      const point: GeoPoint = {
        longitude: 127.0,
        latitude: 37.5
      };

      expect(() => {
        engine.transform(point, 'INVALID_SYSTEM' as any, 'WGS84');
      }).toThrow(CoordinateError);
    });

    it('should throw error for invalid coordinates', () => {
      const invalidPoint: GeoPoint = {
        longitude: 200, // Out of range
        latitude: 37.5
      };

      expect(() => {
        engine.transform(invalidPoint, 'WGS84', 'GRS80_CENTRAL');
      }).toThrow(CoordinateError);
    });
  });

  describe('transformBatch', () => {
    it('should return empty array for empty input', () => {
      const result = engine.transformBatch([], 'WGS84', 'GRS80_CENTRAL');
      expect(result).toEqual([]);
    });

    it('should transform multiple points at once', () => {
      const points: GeoPoint[] = [
        { longitude: 126.9780, latitude: 37.5665 }, // Seoul
        { longitude: 129.0756, latitude: 35.1796 }, // Busan
        { longitude: 126.7052, latitude: 37.4563 }  // Incheon
      ];

      const results = engine.transformBatch(points, 'WGS84', 'GRS80_CENTRAL') as ProjectedPoint[];

      expect(results).toHaveLength(3);

      // Verify each transformation
      expect(results[0].x).toBeCloseTo(198056.37, 0);
      expect(results[0].y).toBeCloseTo(551885.03, 0);

      expect(results[1].x).toBeCloseTo(389076.80, 0);
      expect(results[1].y).toBeCloseTo(288993.76, 0);

      expect(results[2].x).toBeCloseTo(173916.96, 0);
      expect(results[2].y).toBeCloseTo(539694.82, 0);
    });

    it('should handle large batch efficiently', () => {
      const largePoints: GeoPoint[] = Array.from({ length: 100 }, (_, i) => ({
        longitude: 126 + (i * 0.01),
        latitude: 37 + (i * 0.01)
      }));

      const startTime = Date.now();
      const results = engine.transformBatch(largePoints, 'WGS84', 'GRS80_CENTRAL');
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('transformWithMetadata', () => {
    it('should return detailed transformation result', () => {
      const point: GeoPoint = {
        longitude: 126.9780,
        latitude: 37.5665
      };

      const result = engine.transformWithMetadata(point, 'WGS84', 'GRS80_CENTRAL');

      expect(result).toHaveProperty('input');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('accuracy');

      expect(result.input.point).toEqual(point);
      expect(result.input.system).toBe('WGS84');
      expect(result.output.system).toBe('GRS80_CENTRAL');
      expect(result.accuracy).toBe('< 1m');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid WGS84 coordinates', () => {
      const minPoint: GeoPoint = {
        longitude: -180,
        latitude: -90
      };

      expect(() => engine.transform(minPoint, 'WGS84', 'GRS80_CENTRAL')).not.toThrow();
    });

    it('should handle maximum valid WGS84 coordinates', () => {
      const maxPoint: GeoPoint = {
        longitude: 180,
        latitude: 90
      };

      expect(() => engine.transform(maxPoint, 'WGS84', 'GRS80_CENTRAL')).not.toThrow();
    });

    it('should handle coordinates at Korea boundaries', () => {
      const koreaEdgePoints: GeoPoint[] = [
        { longitude: 124, latitude: 33 },  // Southwest
        { longitude: 132, latitude: 43 },  // Northeast
        { longitude: 124, latitude: 43 },  // Northwest
        { longitude: 132, latitude: 33 }   // Southeast
      ];

      koreaEdgePoints.forEach(point => {
        expect(() => engine.transform(point, 'WGS84', 'GRS80_CENTRAL')).not.toThrow();
      });
    });
  });

  describe('Coordinate System Coverage', () => {
    it('should transform between all supported systems', () => {
      const systems = engine.getSupportedSystems();
      const testPoint: GeoPoint = {
        longitude: 126.9780,
        latitude: 37.5665
      };

      // Test transformation from WGS84 to all other systems
      systems.forEach(targetSystem => {
        if (targetSystem !== 'WGS84') {
          expect(() => {
            engine.transform(testPoint, 'WGS84', targetSystem);
          }).not.toThrow();
        }
      });
    });

    it('should support round-trip transformation for all systems', () => {
      const originalPoint: GeoPoint = {
        longitude: 128.6014,
        latitude: 35.8714
      };

      const systems = engine.getSupportedSystems().filter(s => s !== 'WGS84');

      systems.forEach(system => {
        // WGS84 → System → WGS84
        const transformed = engine.transform(originalPoint, 'WGS84', system);
        const roundTrip = engine.transform(transformed, system, 'WGS84') as ProjectedPoint;

        // Should be very close to original (within 0.000001 degrees)
        expect(roundTrip.x).toBeCloseTo(originalPoint.longitude, 5);
        expect(roundTrip.y).toBeCloseTo(originalPoint.latitude, 5);
      });
    });
  });
});
