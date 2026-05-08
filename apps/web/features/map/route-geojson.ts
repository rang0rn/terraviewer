import type { TrackPoint } from '@/lib/gpx/parser'

// GeoJSON requires [longitude, latitude] — reversed from GPX lat/lon order.
export function trackPointsToLngLat(points: TrackPoint[]): [number, number][] {
  return points.map((p) => [p.lng, p.lat])
}
