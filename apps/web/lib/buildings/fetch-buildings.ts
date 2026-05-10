import type { BuildingFeature } from '@/types/terrain'
import type { RouteBounds } from '@/types/configurator'

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
const DEFAULT_HEIGHT = 10
const MAX_BUILDINGS = 200

type OverpassElement = {
  type: 'node' | 'way'
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags?: Record<string, string>
}

export async function fetchBuildings(bounds: RouteBounds): Promise<BuildingFeature[]> {
  const { minLat, maxLat, minLng, maxLng } = bounds
  const query = [
    '[out:json][timeout:25];',
    `way["building"](${minLat},${minLng},${maxLat},${maxLng});`,
    '(._;>;);',
    'out body qt;',
  ].join('')

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) throw new Error(`Overpass ${response.status}`)

  const data = (await response.json()) as { elements: OverpassElement[] }
  const elements = data.elements ?? []

  const nodeMap = new Map<number, [number, number]>()
  const ways: OverpassElement[] = []

  for (const el of elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodeMap.set(el.id, [el.lon, el.lat])
    } else if (el.type === 'way' && el.tags) {
      ways.push(el)
    }
  }

  const buildings: BuildingFeature[] = []

  for (const way of ways.slice(0, MAX_BUILDINGS)) {
    const nodeRefs = way.nodes ?? []
    const footprint = nodeRefs
      .map((id) => nodeMap.get(id))
      .filter((pt): pt is [number, number] => pt !== undefined)

    if (footprint.length < 4) continue

    const tags = way.tags ?? {}
    const height = tags.height
      ? parseFloat(tags.height)
      : tags['building:levels']
        ? parseInt(tags['building:levels'], 10) * 3
        : DEFAULT_HEIGHT

    buildings.push({ footprint, height: isNaN(height) ? DEFAULT_HEIGHT : height })
  }

  return buildings
}
