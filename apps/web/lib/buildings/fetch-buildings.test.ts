import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBuildings } from './fetch-buildings'

const BOUNDS = { minLat: 48.1, maxLat: 48.2, minLng: 11.5, maxLng: 11.6 }

function makeOverpassResponse(elements: object[]) {
  return Promise.resolve(
    new Response(JSON.stringify({ elements }), { status: 200 })
  )
}

const NODES = [
  { type: 'node', id: 1, lat: 48.11, lon: 11.51 },
  { type: 'node', id: 2, lat: 48.12, lon: 11.51 },
  { type: 'node', id: 3, lat: 48.12, lon: 11.52 },
  { type: 'node', id: 4, lat: 48.11, lon: 11.52 },
]
const WAY_CLOSED = {
  type: 'way',
  id: 100,
  nodes: [1, 2, 3, 4, 1],
  tags: { building: 'yes', 'building:levels': '3' },
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('fetchBuildings', () => {
  it('returns buildings with correct height from building:levels', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeOverpassResponse([...NODES, WAY_CLOSED]) as Promise<Response>
    )
    const result = await fetchBuildings(BOUNDS)
    expect(result).toHaveLength(1)
    expect(result[0].height).toBe(9) // 3 levels × 3 m
    expect(result[0].footprint).toHaveLength(5)
  })

  it('uses height tag when present', async () => {
    const way = { ...WAY_CLOSED, tags: { building: 'yes', height: '15' } }
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeOverpassResponse([...NODES, way]) as Promise<Response>
    )
    const result = await fetchBuildings(BOUNDS)
    expect(result[0].height).toBe(15)
  })

  it('falls back to DEFAULT_HEIGHT when no height tags', async () => {
    const way = { ...WAY_CLOSED, tags: { building: 'yes' } }
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeOverpassResponse([...NODES, way]) as Promise<Response>
    )
    const result = await fetchBuildings(BOUNDS)
    expect(result[0].height).toBe(10)
  })

  it('returns empty array when Overpass returns no ways', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeOverpassResponse([]) as Promise<Response>
    )
    const result = await fetchBuildings(BOUNDS)
    expect(result).toHaveLength(0)
  })

  it('throws when Overpass returns non-200', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 429 }) as Response)
    await expect(fetchBuildings(BOUNDS)).rejects.toThrow('Overpass 429')
  })

  it('skips ways with fewer than 4 resolved nodes', async () => {
    const incompleteWay = { ...WAY_CLOSED, nodes: [1, 2, 99] } // node 99 missing from map
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeOverpassResponse([...NODES, incompleteWay]) as Promise<Response>
    )
    const result = await fetchBuildings(BOUNDS)
    expect(result).toHaveLength(0)
  })
})
