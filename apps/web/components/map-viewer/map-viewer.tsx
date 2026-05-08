'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useConfiguratorStore } from '@/lib/store/configurator'
import type { RouteColor } from '@/types/configurator'

const ROUTE_COLOR_HEX: Record<RouteColor, string> = {
  orange: '#f97316',
  green:  '#22c55e',
  blue:   '#3b82f6',
  red:    '#ef4444',
  white:  '#ffffff',
  yellow: '#eab308',
  black:  '#18181b',
}

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export function MapViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  const routeCoordinates = useConfiguratorStore((s) => s.routeCoordinates)
  const routeBounds = useConfiguratorStore((s) => s.routeBounds)
  const routeColor = useConfiguratorStore((s) => s.routeColor)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [TILE_URL],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [0, 0],
      zoom: 2,
      pitchWithRotate: false,
      dragRotate: false,
    })
    mapRef.current = map

    map.on('load', () => {
      if (!routeCoordinates?.length) return

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: routeCoordinates },
          properties: {},
        },
      })
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ROUTE_COLOR_HEX[routeColor], 'line-width': 3 },
      })

      if (routeBounds) {
        map.fitBounds(
          [
            [routeBounds.minLng, routeBounds.minLat],
            [routeBounds.maxLng, routeBounds.maxLat],
          ],
          { padding: 48, animate: false },
        )
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!routeCoordinates) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
        Keine Routendaten vorhanden.
      </div>
    )
  }

  return <div ref={containerRef} className="h-[480px] w-full rounded-xl overflow-hidden" />
}
