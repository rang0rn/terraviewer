import type { RouteBounds } from '@/types/configurator'
import type { TerrainQuality } from '@/types/terrain'

export const TILE_SIZE = 512

export function lngLatToTileXY(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  )
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) }
}

export function tileBounds(tx: number, ty: number, z: number): RouteBounds {
  const n = 2 ** z
  const minLng = (tx / n) * 360 - 180
  const maxLng = ((tx + 1) / n) * 360 - 180
  const maxLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI
  const minLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + 1)) / n))) * 180) / Math.PI
  return { minLat, maxLat, minLng, maxLng }
}

export function terrariumDecode(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768
}

export function zoomForQuality(quality: TerrainQuality): number {
  return quality === 'desktop' ? 12 : 11
}

export function resolutionForQuality(quality: TerrainQuality): number {
  return quality === 'desktop' ? 128 : 64
}
