import { describe, it, expect } from 'vitest'
import { generateShapeGeoJSON } from './shape-geojson'

const BOUNDS = { minLat: 48.0, maxLat: 48.1, minLng: 11.5, maxLng: 11.7 }

describe('generateShapeGeoJSON', () => {
  it('returns a GeoJSON Feature with Polygon geometry', () => {
    const result = generateShapeGeoJSON(BOUNDS, 'circle')
    expect(result.type).toBe('Feature')
    expect(result.geometry.type).toBe('Polygon')
  })

  it('circle has 65 coordinate pairs (64 steps + closing)', () => {
    const result = generateShapeGeoJSON(BOUNDS, 'circle')
    expect(result.geometry.coordinates[0]).toHaveLength(65)
  })

  it('hexagon has 7 coordinate pairs (6 steps + closing)', () => {
    const result = generateShapeGeoJSON(BOUNDS, 'hexagon')
    expect(result.geometry.coordinates[0]).toHaveLength(7)
  })

  it('center of the polygon is near the midpoint of bounds', () => {
    const result = generateShapeGeoJSON(BOUNDS, 'circle')
    const coords = result.geometry.coordinates[0]
    const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length
    const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length
    expect(avgLng).toBeCloseTo((BOUNDS.minLng + BOUNDS.maxLng) / 2, 1)
    expect(avgLat).toBeCloseTo((BOUNDS.minLat + BOUNDS.maxLat) / 2, 1)
  })

  it('does not throw for a zero-extent route (single trackpoint bounds)', () => {
    const zeroBounds = { minLat: 48.1, maxLat: 48.1, minLng: 11.5, maxLng: 11.5 }
    expect(() => generateShapeGeoJSON(zeroBounds, 'circle')).not.toThrow()
  })
})
