import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/terrain/tile-fetch')

import { GET } from './route'
import { fetchTerrainGrid } from '@/lib/terrain/tile-fetch'
import type { TerrainApiResponse } from '@/types/terrain'
import type { NextRequest } from 'next/server'

function makeGrid(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(100))
}

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/terrain/data')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return { nextUrl: url } as unknown as NextRequest
}

describe('GET /api/terrain/data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchTerrainGrid).mockResolvedValue({ grid: makeGrid(64), minEle: 400, maxEle: 900 })
  })

  it('returns terrain data for valid bounds and preview quality', async () => {
    const res = await GET(
      makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6', quality: 'preview' })
    )
    const body = (await res.json()) as TerrainApiResponse
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    if (body.success) {
      expect(body.terrain.resolution).toBe(64)
      expect(body.terrain.minEle).toBe(400)
      expect(body.terrain.maxEle).toBe(900)
      expect(body.terrain.grid).toHaveLength(64)
    }
  })

  it('returns 400 when bounds params are missing', async () => {
    const res = await GET(makeRequest({ quality: 'preview' }))
    const body = (await res.json()) as TerrainApiResponse
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    if (!body.success) expect(body.errorCode).toBe('MISSING_PARAMS')
  })

  it('returns 400 when a bound is non-numeric', async () => {
    const res = await GET(
      makeRequest({ minLat: 'abc', maxLat: '48.2', minLng: '11.5', maxLng: '11.6' })
    )
    const body = (await res.json()) as TerrainApiResponse
    expect(res.status).toBe(400)
    if (!body.success) expect(body.errorCode).toBe('MISSING_PARAMS')
  })

  it('returns 502 when tile fetch throws', async () => {
    vi.mocked(fetchTerrainGrid).mockRejectedValueOnce(new Error('network timeout'))
    const res = await GET(
      makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6' })
    )
    const body = (await res.json()) as TerrainApiResponse
    expect(res.status).toBe(502)
    if (!body.success) expect(body.errorCode).toBe('TERRAIN_FETCH_ERROR')
  })

  it('falls back to preview quality (resolution=64, z=11) for unknown quality string', async () => {
    await GET(
      makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6', quality: 'ultra' })
    )
    expect(vi.mocked(fetchTerrainGrid)).toHaveBeenCalledWith(
      expect.objectContaining({ minLat: 48.1, maxLat: 48.2, minLng: 11.5, maxLng: 11.6 }),
      64,
      11
    )
  })

  it('uses resolution=128 and z=12 for desktop quality', async () => {
    vi.mocked(fetchTerrainGrid).mockResolvedValue({ grid: makeGrid(128), minEle: 300, maxEle: 800 })
    const res = await GET(
      makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6', quality: 'desktop' })
    )
    const body = (await res.json()) as TerrainApiResponse
    expect(res.status).toBe(200)
    if (body.success) expect(body.terrain.resolution).toBe(128)
    expect(vi.mocked(fetchTerrainGrid)).toHaveBeenCalledWith(expect.anything(), 128, 12)
  })
})
