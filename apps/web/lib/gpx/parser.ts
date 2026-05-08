import { XMLParser } from 'fast-xml-parser'
import type { RouteBounds } from '@/types/configurator'

type TrackPoint = { lat: number; lng: number; ele: number | null }

type ParsedGpx = {
  trackPoints: TrackPoint[]
  routeBounds: RouteBounds
  hasElevation: boolean
}

export function parseGpx(xmlContent: string): ParsedGpx {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['trkpt', 'trkseg', 'trk'].includes(name),
    removeNSPrefix: true,
  })

  let parsed: unknown
  try {
    parsed = parser.parse(xmlContent)
  } catch {
    throw new Error('INVALID_GPX_FORMAT')
  }

  const gpxNode = (parsed as Record<string, unknown>)['gpx']
  if (!gpxNode || typeof gpxNode !== 'object') throw new Error('INVALID_GPX_FORMAT')

  const trks = (gpxNode as Record<string, unknown>)['trk'] as unknown[] | undefined
  if (!trks || trks.length === 0) throw new Error('INVALID_GPX_FORMAT')

  const trackPoints: TrackPoint[] = []

  for (const trk of trks) {
    const trkObj = trk as Record<string, unknown>
    const trksegs = trkObj['trkseg'] as unknown[] | undefined
    if (!trksegs) continue
    for (const seg of trksegs) {
      const segObj = seg as Record<string, unknown>
      const trkpts = segObj['trkpt'] as unknown[] | undefined
      if (!trkpts) continue
      for (const pt of trkpts) {
        const ptObj = pt as Record<string, unknown>
        const lat = parseFloat(String(ptObj['@_lat'] ?? ''))
        const lng = parseFloat(String(ptObj['@_lon'] ?? ''))
        const ele = ptObj['ele'] != null ? parseFloat(String(ptObj['ele'])) : null
        if (!isNaN(lat) && !isNaN(lng)) {
          trackPoints.push({ lat, lng, ele })
        }
      }
    }
  }

  if (trackPoints.length === 0) throw new Error('INVALID_GPX_FORMAT')

  const lats = trackPoints.map((p) => p.lat)
  const lngs = trackPoints.map((p) => p.lng)
  const routeBounds: RouteBounds = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  }

  const hasElevation = trackPoints.some((p) => p.ele !== null && p.ele !== 0)

  return { trackPoints, routeBounds, hasElevation }
}
