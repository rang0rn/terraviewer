import sharp from 'sharp'
import type { RouteBounds } from '@/types/configurator'
import { lngLatToTileXY, tileBounds, terrariumDecode } from './tile-math'

const TILE_URL = 'https://tiles.mapterhorn.com'

type TilePixels = { data: Buffer; width: number; height: number }

async function fetchOneTile(z: number, x: number, y: number): Promise<TilePixels> {
  const url = `${TILE_URL}/${z}/${x}/${y}.webp`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Tile ${z}/${x}/${y}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

function samplePixel(tile: TilePixels, px: number, py: number): number {
  const clampedPx = Math.max(0, Math.min(tile.width - 1, Math.floor(px)))
  const clampedPy = Math.max(0, Math.min(tile.height - 1, Math.floor(py)))
  const idx = (clampedPy * tile.width + clampedPx) * 4  // RGBA
  return terrariumDecode(tile.data[idx], tile.data[idx + 1], tile.data[idx + 2])
}

export async function fetchTerrainGrid(
  bounds: RouteBounds,
  resolution: number,
  z: number
): Promise<{ grid: number[][]; minEle: number; maxEle: number }> {
  const tl = lngLatToTileXY(bounds.minLng, bounds.maxLat, z)  // northwest
  const br = lngLatToTileXY(bounds.maxLng, bounds.minLat, z)  // southeast

  // Fetch all tiles covering the bounding box (typically 1–4 tiles)
  const tileMap = new Map<string, TilePixels>()
  const fetches: Promise<void>[] = []
  for (let ty = tl.y; ty <= br.y; ty++) {
    for (let tx = tl.x; tx <= br.x; tx++) {
      fetches.push(
        fetchOneTile(z, tx, ty).then((t) => {
          tileMap.set(`${tx},${ty}`, t)
        })
      )
    }
  }
  await Promise.all(fetches)

  const grid: number[][] = []
  let minEle = Infinity
  let maxEle = -Infinity

  for (let i = 0; i < resolution; i++) {
    const row: number[] = []
    // i=0 → maxLat (north), i=resolution-1 → minLat (south)
    const lat = bounds.maxLat - (i / (resolution - 1)) * (bounds.maxLat - bounds.minLat)
    for (let j = 0; j < resolution; j++) {
      // j=0 → minLng (west), j=resolution-1 → maxLng (east)
      const lng = bounds.minLng + (j / (resolution - 1)) * (bounds.maxLng - bounds.minLng)

      const { x: tx, y: ty } = lngLatToTileXY(lng, lat, z)
      const tb = tileBounds(tx, ty, z)
      const tile = tileMap.get(`${tx},${ty}`)

      let ele = 0
      if (tile) {
        const px = ((lng - tb.minLng) / (tb.maxLng - tb.minLng)) * tile.width
        const py = ((tb.maxLat - lat) / (tb.maxLat - tb.minLat)) * tile.height
        ele = samplePixel(tile, px, py)
      }

      row.push(ele)
      if (ele < minEle) minEle = ele
      if (ele > maxEle) maxEle = ele
    }
    grid.push(row)
  }

  return {
    grid,
    minEle: isFinite(minEle) ? minEle : 0,
    maxEle: isFinite(maxEle) ? maxEle : 0,
  }
}
