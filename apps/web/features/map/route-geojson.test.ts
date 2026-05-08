import { describe, it, expect } from 'vitest'
import { trackPointsToLngLat } from './route-geojson'

describe('trackPointsToLngLat', () => {
  it('returns an empty array for no points', () => {
    expect(trackPointsToLngLat([])).toEqual([])
  })

  it('maps to [lng, lat] GeoJSON order (not [lat, lng])', () => {
    const result = trackPointsToLngLat([{ lat: 48.1, lng: 11.5, ele: 500 }])
    expect(result).toEqual([[11.5, 48.1]])
  })

  it('preserves all points', () => {
    const points = [
      { lat: 48.1, lng: 11.5, ele: 500 },
      { lat: 48.2, lng: 11.7, ele: 520 },
      { lat: 48.3, lng: 11.9, ele: null },
    ]
    const result = trackPointsToLngLat(points)
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual([11.9, 48.3])
  })

  it('handles points without elevation', () => {
    const result = trackPointsToLngLat([{ lat: 0, lng: 0, ele: null }])
    expect(result).toEqual([[0, 0]])
  })
})
