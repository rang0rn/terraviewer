import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures this runs before vi.mock factories (which are hoisted)
const mockToBuffer = vi.hoisted(() => vi.fn())

function makeUniformPixels(w: number, h: number, r: number, g: number, b: number): Buffer {
  const buf = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r
    buf[i * 4 + 1] = g
    buf[i * 4 + 2] = b
    buf[i * 4 + 3] = 255
  }
  return buf
}

vi.mock('sharp', () => {
  const instance = {
    raw: vi.fn().mockReturnThis(),
    ensureAlpha: vi.fn().mockReturnThis(),
    toBuffer: mockToBuffer,
  }
  return { default: vi.fn(() => instance) }
})

import { fetchTerrainGrid } from './tile-fetch'

const MUNICH_BOUNDS = { minLat: 48.1, maxLat: 48.2, minLng: 11.5, maxLng: 11.6 }

describe('fetchTerrainGrid', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response)

    // Default: sea-level pixels (R=128, G=0, B=0 → 0m)
    mockToBuffer.mockResolvedValue({
      data: makeUniformPixels(512, 512, 128, 0, 0),
      info: { width: 512, height: 512, channels: 4 },
    })
  })

  it('returns a grid of the requested resolution', async () => {
    const { grid } = await fetchTerrainGrid(MUNICH_BOUNDS, 4, 11)
    expect(grid).toHaveLength(4)
    expect(grid[0]).toHaveLength(4)
  })

  it('decodes uniform sea-level pixels to elevation ≈ 0m', async () => {
    const { grid, minEle, maxEle } = await fetchTerrainGrid(MUNICH_BOUNDS, 4, 11)
    for (const row of grid) {
      for (const ele of row) {
        expect(ele).toBeCloseTo(0, 1)
      }
    }
    expect(minEle).toBeCloseTo(0, 1)
    expect(maxEle).toBeCloseTo(0, 1)
  })

  it('decodes 500m elevation pixels correctly', async () => {
    // R=129, G=244, B=0 → 129*256 + 244 - 32768 = 33024 + 244 - 32768 = 500
    mockToBuffer.mockResolvedValue({
      data: makeUniformPixels(512, 512, 129, 244, 0),
      info: { width: 512, height: 512, channels: 4 },
    })
    const { grid, minEle, maxEle } = await fetchTerrainGrid(MUNICH_BOUNDS, 4, 11)
    for (const row of grid) {
      for (const ele of row) {
        expect(ele).toBeCloseTo(500, 0)
      }
    }
    expect(minEle).toBeCloseTo(500, 0)
    expect(maxEle).toBeCloseTo(500, 0)
  })

  it('throws when the tile server returns an HTTP error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response)
    await expect(fetchTerrainGrid(MUNICH_BOUNDS, 4, 11)).rejects.toThrow('HTTP 404')
  })
})
