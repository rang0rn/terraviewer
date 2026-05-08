import { describe, it, expect } from 'vitest'
import { isRouteOutOfBounds } from './out-of-bounds'
import { generateShapeGeoJSON } from './shape-geojson'

const BOUNDS = { minLat: 48.0, maxLat: 48.1, minLng: 11.5, maxLng: 11.7 }

describe('isRouteOutOfBounds', () => {
  it('returns false when all coords are inside the shape', () => {
    const shape = generateShapeGeoJSON(BOUNDS, 'circle')
    // centroid — guaranteed inside
    const coords: [number, number][] = [[11.6, 48.05]]
    expect(isRouteOutOfBounds(coords, shape)).toBe(false)
  })

  it('returns true when any coord is outside the shape', () => {
    const shape = generateShapeGeoJSON(BOUNDS, 'circle')
    // far-away point guaranteed outside
    const coords: [number, number][] = [[11.6, 48.05], [0, 0]]
    expect(isRouteOutOfBounds(coords, shape)).toBe(true)
  })

  it('returns false for an empty coords array (no points = no violations)', () => {
    const shape = generateShapeGeoJSON(BOUNDS, 'circle')
    expect(isRouteOutOfBounds([], shape)).toBe(false)
  })

  it('returns true when a single coord is outside the shape', () => {
    const shape = generateShapeGeoJSON(BOUNDS, 'circle')
    const coords: [number, number][] = [[0, 0]]
    expect(isRouteOutOfBounds(coords, shape)).toBe(true)
  })

  it('hexagon shape: route centroid is inside', () => {
    const shape = generateShapeGeoJSON(BOUNDS, 'hexagon')
    const coords: [number, number][] = [[11.6, 48.05]]
    expect(isRouteOutOfBounds(coords, shape)).toBe(false)
  })
})
