import { describe, it, expect } from 'vitest'
import {
  lngLatToTileXY,
  tileBounds,
  terrariumDecode,
  zoomForQuality,
  resolutionForQuality,
} from './tile-math'

describe('lngLatToTileXY', () => {
  it('maps Munich (11.58, 48.14) at z=11 to known tile', () => {
    const { x, y } = lngLatToTileXY(11.58, 48.14, 11)
    expect(x).toBe(1089)
    expect(y).toBe(710)
  })

  it('maps prime meridian / equator at z=1 to tile (1, 1)', () => {
    const { x, y } = lngLatToTileXY(0.001, -0.001, 1)
    expect(x).toBe(1)
    expect(y).toBe(1)
  })

  it('clamps extreme longitude to valid tile range', () => {
    const { x } = lngLatToTileXY(200, 0, 10)
    expect(x).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThan(1024)
  })

  it('clamps extreme latitude to valid tile range', () => {
    const { y } = lngLatToTileXY(0, 89.9, 10)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(y).toBeLessThan(1024)
  })
})

describe('tileBounds', () => {
  it('returns bounds that contain the original lat/lng used to derive the tile', () => {
    const lng = 11.58
    const lat = 48.14
    const z = 11
    const { x, y } = lngLatToTileXY(lng, lat, z)
    const b = tileBounds(x, y, z)
    expect(b.minLng).toBeLessThanOrEqual(lng)
    expect(b.maxLng).toBeGreaterThan(lng)
    expect(b.minLat).toBeLessThanOrEqual(lat)
    expect(b.maxLat).toBeGreaterThan(lat)
  })

  it('produces non-zero-width bounds', () => {
    const b = tileBounds(1089, 710, 11)
    expect(b.maxLng - b.minLng).toBeGreaterThan(0)
    expect(b.maxLat - b.minLat).toBeGreaterThan(0)
  })
})

describe('terrariumDecode', () => {
  it('decodes sea level: R=128, G=0, B=0 → 0m', () => {
    expect(terrariumDecode(128, 0, 0)).toBe(0)
  })

  it('decodes 100m above sea level: R=128, G=100, B=0', () => {
    expect(terrariumDecode(128, 100, 0)).toBe(100)
  })

  it('decodes below sea level (R=127, G=255, B=0 → ~-1m)', () => {
    expect(terrariumDecode(127, 255, 0)).toBeCloseTo(-1, 0)
  })

  it('applies B channel fractional contribution', () => {
    const withB = terrariumDecode(128, 0, 128)
    const withoutB = terrariumDecode(128, 0, 0)
    expect(withB - withoutB).toBeCloseTo(0.5, 5)
  })
})

describe('zoomForQuality / resolutionForQuality', () => {
  it('returns z=12 and resolution=128 for desktop', () => {
    expect(zoomForQuality('desktop')).toBe(12)
    expect(resolutionForQuality('desktop')).toBe(128)
  })

  it('returns z=11 and resolution=64 for preview', () => {
    expect(zoomForQuality('preview')).toBe(11)
    expect(resolutionForQuality('preview')).toBe(64)
  })

  it('returns z=11 and resolution=64 for mobile', () => {
    expect(zoomForQuality('mobile')).toBe(11)
    expect(resolutionForQuality('mobile')).toBe(64)
  })
})
