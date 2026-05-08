import circle from '@turf/circle'
import type { Shape, RouteBounds } from '@/types/configurator'

export function generateShapeGeoJSON(bounds: RouteBounds, shape: Shape) {
  const centerLng = (bounds.minLng + bounds.maxLng) / 2
  const centerLat = (bounds.minLat + bounds.maxLat) / 2
  const latSpanKm = (bounds.maxLat - bounds.minLat) * 111
  const lngSpanKm =
    (bounds.maxLng - bounds.minLng) * 111 * Math.cos(centerLat * (Math.PI / 180))
  const radiusKm = Math.max(
    (Math.sqrt(latSpanKm ** 2 + lngSpanKm ** 2) / 2) * 1.1,
    0.1,
  )
  const steps = shape === 'circle' ? 64 : 6
  return circle([centerLng, centerLat], radiusKm, { steps, units: 'kilometers' })
}
