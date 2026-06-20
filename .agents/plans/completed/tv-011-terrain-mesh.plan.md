# Plan: TV-011 Terrain Mesh (Mapterhorn DEM Tiles)

## Summary

Build the terrain 3D preview using real elevation data from **Mapterhorn.com** (Terrarium RGB–encoded WebP tiles, Copernicus GLO-30 30m global DEM). A server-side API route fetches the tiles covering the route's bounding box, decodes pixel RGB to elevation, and returns a flat elevation grid. The client-side `TerrainMesh` R3F component displaces a `PlaneGeometry` with those elevations, masks to the selected shape (circle or flat-top hexagon), renders a route `TubeGeometry` on top, and adds a solid sockel below. The existing placeholder cylinder in `TerrainViewer` is replaced with this live mesh.

## User Story

As a customer
I want to see a 3D terrain model of my route area when I reach the preview step
So that I can judge how the printed terrain insert will look

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | HIGH |
| Systems Affected | API routes, R3F viewer, terrain lib |
| Jira Issue | TV-011 |

---

## Mapterhorn Tile Details

| Property | Value |
|---|---|
| Tile URL | `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp` |
| Tile size | 512 × 512 px |
| Encoding | Terrarium RGB (WebP) |
| Elevation decode | `elevation = R * 256 + G + B / 256 − 32768` (metres) |
| Zoom for detail | z=11 (mobile/preview), z=12 (desktop) |
| License | BSD-3-Clause, no API key required |

---

## Patterns to Follow

### API Route Handler
```ts
// SOURCE: apps/web/app/api/gpx/upload/route.ts:11-20
export async function GET(request: NextRequest): Promise<NextResponse<TerrainApiResponse>> {
  // validate params
  // call lib function
  // return NextResponse.json(...)
}
```

### Zustand Store Read (client)
```ts
// SOURCE: apps/web/components/upload/gpx-dropzone.tsx:16
const { updateConfig, advanceStep } = useConfiguratorStore()
// reading: const { routeBounds, routeCoordinates, shape } = useConfiguratorStore()
```

### R3F Imperative Geometry Mutation
```ts
// Pattern from prior TV-011 work — mutate after mount:
useEffect(() => {
  const geo = geoRef.current
  if (!geo) return
  const pos = geo.attributes.position
  pos.setZ(vertexIndex, elevationValue)
  pos.needsUpdate = true
  geo.computeVertexNormals()
  invalidate()   // from useThree() — required for frameloop="demand"
}, [deps])
```

### Test Mocking (vi.mock)
```ts
// SOURCE: apps/web/app/api/gpx/upload/route.test.ts:8-9
vi.mock('@/lib/storage/get-storage')
vi.mock('@/lib/upload/rate-limit')
```

### Error Response Shape
```ts
// SOURCE: apps/web/app/api/gpx/upload/route.ts:13-16
return NextResponse.json(
  { success: false, errorCode: 'MISSING_PARAMS', message: 'Fehlende Parameter.' },
  { status: 400 }
)
```

---

## Coordinate System Reference

**PlaneGeometry(2, 2, res-1, res-1)** flat-rotated with `rotation={[-Math.PI/2, 0, 0]}`:

| Local axis | World axis | Grid direction |
|---|---|---|
| X (-1 → +1) | X (-1 → +1) | West → East (minLng → maxLng) |
| Y (+1 → -1) | -Z (−1 → +1) | North → South (maxLat → minLat) |
| Z (displaced) | Y | Elevation |

Vertex at grid index `(i, j)`:
- `world_x = -1 + j * 2/(res-1)`  → `lng = minLng + j/(res-1) * (maxLng - minLng)`
- `world_z = -1 + i * 2/(res-1)`  → `lat = maxLat - i/(res-1) * (maxLat - minLat)`
- `pos.setZ(i*res + j, h)` sets world Y = h

Route point `[lng, lat]` → 3D position:
- `nx = -1 + (lng - minLng) / (maxLng - minLng) * 2`
- `nz = -1 + (maxLat - lat) / (maxLat - minLat) * 2`

**Shape masks** (applied in normalized coords nx, nz ∈ [-1, +1]):
- Circle: `nx² + nz² ≤ 1`
- Hexagon (flat-top, circumradius=1):
  `|nz| ≤ √3/2  AND  |nz + nx*√3| ≤ √3  AND  |nz − nx*√3| ≤ √3`

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/package.json` | UPDATE | Add `sharp` dependency for WebP decoding |
| `apps/web/types/terrain.ts` | CREATE | TerrainQuality, TerrainData, TerrainApiResponse types |
| `apps/web/lib/terrain/tile-math.ts` | CREATE | Tile XYZ math, Terrarium decode, zoom mapping |
| `apps/web/lib/terrain/tile-math.test.ts` | CREATE | Unit tests for tile math |
| `apps/web/lib/terrain/tile-fetch.ts` | CREATE | Fetch tiles, decode pixels, build elevation grid |
| `apps/web/lib/terrain/tile-fetch.test.ts` | CREATE | Unit tests with mocked fetch and sharp |
| `apps/web/app/api/terrain/data/route.ts` | CREATE | GET /api/terrain/data handler |
| `apps/web/app/api/terrain/data/route.test.ts` | CREATE | API handler tests |
| `apps/web/components/terrain-viewer/terrain-mesh.tsx` | CREATE | R3F TerrainMesh component |
| `apps/web/components/terrain-viewer/terrain-viewer.tsx` | UPDATE | Replace placeholder; fetch terrain; render TerrainMesh |

---

## Tasks

### Task 1: Add `sharp` dependency

- **File**: `apps/web/package.json`
- **Action**: UPDATE
- **Implement**: Run `pnpm add sharp --filter web`. `sharp` is used server-side only in the API route for WebP pixel decoding. It is a native module shipped with Next.js's optional deps; installing it explicitly pins the version.
- **Mirror**: existing `dependencies` in package.json
- **Validate**: `pnpm run build`

### Task 2: Create terrain types

- **File**: `apps/web/types/terrain.ts`
- **Action**: CREATE
- **Implement**:
```ts
export type TerrainQuality = 'mobile' | 'preview' | 'desktop'

export type TerrainData = {
  grid: number[][]         // [res][res], grid[0][0] = NW corner (maxLat, minLng)
  resolution: number       // grid is resolution × resolution
  minEle: number           // metres, used to normalize
  maxEle: number           // metres
}

export type TerrainApiResponse =
  | { success: true; terrain: TerrainData }
  | { success: false; errorCode: string; message: string }
```
- **Mirror**: `apps/web/types/upload.ts:1-26` — discriminated union pattern
- **Validate**: `pnpm run build`

### Task 3: Create tile-math library

- **File**: `apps/web/lib/terrain/tile-math.ts`
- **Action**: CREATE
- **Implement**:
```ts
import type { RouteBounds } from '@/types/configurator'
import type { TerrainQuality } from '@/types/terrain'

const TILE_SIZE = 512

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

export { TILE_SIZE }
```
- **Mirror**: standard Web Mercator tile math (no external dep needed)
- **Validate**: `pnpm run build`

### Task 4: Create tile-math tests

- **File**: `apps/web/lib/terrain/tile-math.test.ts`
- **Action**: CREATE
- **Implement**:
```ts
import { describe, it, expect } from 'vitest'
import { lngLatToTileXY, tileBounds, terrariumDecode, zoomForQuality, resolutionForQuality } from './tile-math'

describe('lngLatToTileXY', () => {
  it('maps Munich (11.58, 48.14) at z=11 to known tile', () => {
    const { x, y } = lngLatToTileXY(11.58, 48.14, 11)
    expect(x).toBe(1094)
    expect(y).toBe(713)
  })

  it('clamps out-of-range values to valid tile range', () => {
    const { x, y } = lngLatToTileXY(200, 90, 10)
    expect(x).toBeGreaterThanOrEqual(0)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThan(1024)
    expect(y).toBeLessThan(1024)
  })
})

describe('tileBounds', () => {
  it('returns bounds that contain the original lat/lng used to derive the tile', () => {
    const lng = 11.58, lat = 48.14, z = 11
    const { x, y } = lngLatToTileXY(lng, lat, z)
    const b = tileBounds(x, y, z)
    expect(b.minLng).toBeLessThanOrEqual(lng)
    expect(b.maxLng).toBeGreaterThan(lng)
    expect(b.minLat).toBeLessThanOrEqual(lat)
    expect(b.maxLat).toBeGreaterThan(lat)
  })
})

describe('terrariumDecode', () => {
  it('decodes sea level as 0 for RGB (128, 0, 0)', () => {
    expect(terrariumDecode(128, 0, 0)).toBe(0)
  })

  it('decodes a known value: R=128, G=100, B=0 → 100m', () => {
    expect(terrariumDecode(128, 100, 0)).toBe(100)
  })

  it('decodes negative elevation (below sea level)', () => {
    expect(terrariumDecode(127, 255, 0)).toBeCloseTo(-1, 0)
  })
})

describe('zoomForQuality / resolutionForQuality', () => {
  it('returns z=12 and resolution=128 for desktop', () => {
    expect(zoomForQuality('desktop')).toBe(12)
    expect(resolutionForQuality('desktop')).toBe(128)
  })

  it('returns z=11 and resolution=64 for mobile and preview', () => {
    expect(zoomForQuality('mobile')).toBe(11)
    expect(resolutionForQuality('preview')).toBe(64)
  })
})
```
- **Mirror**: `apps/web/lib/gpx/parser.test.ts` — describe/it/expect pattern
- **Validate**: `pnpm test`

### Task 5: Create tile-fetch library

- **File**: `apps/web/lib/terrain/tile-fetch.ts`
- **Action**: CREATE
- **Implement**: Fetches WebP tiles from `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`, decodes with `sharp`, stitches pixel buffers, samples to elevation grid.

```ts
import sharp from 'sharp'
import type { RouteBounds } from '@/types/configurator'
import { lngLatToTileXY, tileBounds, terrariumDecode, TILE_SIZE } from './tile-math'

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
  const idx = (clampedPy * tile.width + clampedPx) * 4   // RGBA
  return terrariumDecode(tile.data[idx], tile.data[idx + 1], tile.data[idx + 2])
}

export async function fetchTerrainGrid(
  bounds: RouteBounds,
  resolution: number,
  z: number
): Promise<{ grid: number[][]; minEle: number; maxEle: number }> {
  const tl = lngLatToTileXY(bounds.minLng, bounds.maxLat, z)   // northwest
  const br = lngLatToTileXY(bounds.maxLng, bounds.minLat, z)   // southeast

  // Fetch all tiles in the bounding box (usually 1–4 tiles)
  const tileMap = new Map<string, TilePixels>()
  const fetches: Promise<void>[] = []
  for (let ty = tl.y; ty <= br.y; ty++) {
    for (let tx = tl.x; tx <= br.x; tx++) {
      fetches.push(
        fetchOneTile(z, tx, ty).then((t) => { tileMap.set(`${tx},${ty}`, t) })
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
```
- **Mirror**: `apps/web/app/api/gpx/upload/route.ts` — async/await, Buffer.from(await res.arrayBuffer())
- **Validate**: `pnpm run build`

### Task 6: Create tile-fetch tests

- **File**: `apps/web/lib/terrain/tile-fetch.test.ts`
- **Action**: CREATE
- **Implement**: Mock `fetch` globally and `sharp` module; verify grid dimensions, min/max elevation, and sea-level decode.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock sharp before importing the module under test
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    raw: vi.fn().mockReturnThis(),
    ensureAlpha: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      data: makeUniformPixels(512, 512, 128, 0, 0, 0),  // sea level
      info: { width: 512, height: 512, channels: 4 },
    }),
  }))
  return { default: mockSharp }
})

function makeUniformPixels(w: number, h: number, r: number, g: number, b: number, a: number): Buffer {
  const buf = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = a
  }
  return buf
}

import { fetchTerrainGrid } from './tile-fetch'

const MUNICH_BOUNDS = { minLat: 48.1, maxLat: 48.2, minLng: 11.5, maxLng: 11.6 }

describe('fetchTerrainGrid', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response)
  })

  it('returns a grid of the requested resolution', async () => {
    const { grid } = await fetchTerrainGrid(MUNICH_BOUNDS, 4, 11)
    expect(grid).toHaveLength(4)
    expect(grid[0]).toHaveLength(4)
  })

  it('decodes uniform sea-level pixels to elevation ≈ 0', async () => {
    const { grid, minEle, maxEle } = await fetchTerrainGrid(MUNICH_BOUNDS, 4, 11)
    for (const row of grid) {
      for (const ele of row) {
        expect(ele).toBeCloseTo(0, 1)
      }
    }
    expect(minEle).toBeCloseTo(0, 1)
    expect(maxEle).toBeCloseTo(0, 1)
  })

  it('returns HTTP error as thrown exception', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response)
    await expect(fetchTerrainGrid(MUNICH_BOUNDS, 4, 11)).rejects.toThrow('HTTP 404')
  })
})
```
- **Mirror**: `apps/web/app/api/gpx/upload/route.test.ts` — vi.mock, vi.spyOn, beforeEach cleanup pattern
- **Validate**: `pnpm test`

### Task 7: Create terrain data API route

- **File**: `apps/web/app/api/terrain/data/route.ts`
- **Action**: CREATE
- **Implement**:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchTerrainGrid } from '@/lib/terrain/tile-fetch'
import { zoomForQuality, resolutionForQuality } from '@/lib/terrain/tile-math'
import type { TerrainApiResponse, TerrainQuality } from '@/types/terrain'
import type { RouteBounds } from '@/types/configurator'

const VALID_QUALITIES = new Set<string>(['mobile', 'preview', 'desktop'])

export async function GET(request: NextRequest): Promise<NextResponse<TerrainApiResponse>> {
  const { searchParams } = request.nextUrl
  const minLat = parseFloat(searchParams.get('minLat') ?? '')
  const maxLat = parseFloat(searchParams.get('maxLat') ?? '')
  const minLng = parseFloat(searchParams.get('minLng') ?? '')
  const maxLng = parseFloat(searchParams.get('maxLng') ?? '')
  const qualityParam = searchParams.get('quality') ?? 'preview'

  if ([minLat, maxLat, minLng, maxLng].some(isNaN)) {
    return NextResponse.json(
      { success: false, errorCode: 'MISSING_PARAMS', message: 'Fehlende oder ungültige Bounds-Parameter.' },
      { status: 400 }
    )
  }

  const quality: TerrainQuality = VALID_QUALITIES.has(qualityParam)
    ? (qualityParam as TerrainQuality)
    : 'preview'

  const bounds: RouteBounds = { minLat, maxLat, minLng, maxLng }
  const z = zoomForQuality(quality)
  const resolution = resolutionForQuality(quality)

  try {
    const { grid, minEle, maxEle } = await fetchTerrainGrid(bounds, resolution, z)
    return NextResponse.json({
      success: true,
      terrain: { grid, resolution, minEle, maxEle },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('[terrain/data]', message)
    return NextResponse.json(
      { success: false, errorCode: 'TERRAIN_FETCH_ERROR', message: 'Geländedaten konnten nicht geladen werden.' },
      { status: 502 }
    )
  }
}
```
- **Mirror**: `apps/web/app/api/gpx/upload/route.ts` — NextRequest/NextResponse, discriminated union response, error handling
- **Validate**: `pnpm run build`

### Task 8: Create terrain data API tests

- **File**: `apps/web/app/api/terrain/data/route.test.ts`
- **Action**: CREATE
- **Implement**:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/terrain/tile-fetch')
vi.mock('@/lib/terrain/tile-math', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/terrain/tile-math')>()
  return { ...actual }
})

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

  it('returns terrain data for valid bounds', async () => {
    const res = await GET(makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6', quality: 'preview' }))
    const body = await res.json() as TerrainApiResponse
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    if (body.success) {
      expect(body.terrain.resolution).toBe(64)
      expect(body.terrain.minEle).toBe(400)
      expect(body.terrain.maxEle).toBe(900)
      expect(body.terrain.grid).toHaveLength(64)
    }
  })

  it('returns 400 when bounds are missing', async () => {
    const res = await GET(makeRequest({ quality: 'preview' }))
    const body = await res.json() as TerrainApiResponse
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    if (!body.success) expect(body.errorCode).toBe('MISSING_PARAMS')
  })

  it('returns 502 when tile fetch throws', async () => {
    vi.mocked(fetchTerrainGrid).mockRejectedValueOnce(new Error('network'))
    const res = await GET(makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6' }))
    const body = await res.json() as TerrainApiResponse
    expect(res.status).toBe(502)
    if (!body.success) expect(body.errorCode).toBe('TERRAIN_FETCH_ERROR')
  })

  it('falls back to preview quality for unknown quality string', async () => {
    await GET(makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6', quality: 'ultra' }))
    expect(vi.mocked(fetchTerrainGrid)).toHaveBeenCalledWith(
      expect.anything(),
      64,
      11
    )
  })
})
```
- **Mirror**: `apps/web/app/api/gpx/upload/route.test.ts` — vi.mock, describe, makeRequest helper
- **Validate**: `pnpm test`

### Task 9: Create TerrainMesh component

- **File**: `apps/web/components/terrain-viewer/terrain-mesh.tsx`
- **Action**: CREATE
- **Implement**:

```tsx
'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useConfiguratorStore } from '@/lib/store/configurator'
import type { TerrainData } from '@/types/terrain'

const ELEVATION_SCALE = { 1: 0.4, 2: 0.7, 3: 1.1 } as const
const SOCKEL_HEIGHT = 0.12
const ROUTE_TUBE_RADIUS = 0.015
const MAX_ROUTE_POINTS = 200

const TERRAIN_COLOR: Record<string, string> = {
  gray: '#888888',
  black: '#1a1a1a',
  white: '#f5f5f5',
}
const ROUTE_COLOR: Record<string, string> = {
  orange: '#ff6b35',
  green: '#4caf50',
  blue: '#2196f3',
  red: '#f44336',
  white: '#ffffff',
  yellow: '#ffeb3b',
  black: '#1a1a1a',
}

function isInCircle(nx: number, nz: number): boolean {
  return nx * nx + nz * nz <= 1
}

function isInHexagon(nx: number, nz: number): boolean {
  const sqrt3 = Math.sqrt(3)
  return (
    Math.abs(nz) <= sqrt3 / 2 &&
    Math.abs(nz + nx * sqrt3) <= sqrt3 &&
    Math.abs(nz - nx * sqrt3) <= sqrt3
  )
}

function subsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr
  const step = arr.length / maxPoints
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.floor(i * step)])
}

export function TerrainMesh({ terrain }: { terrain: TerrainData }) {
  const { shape, elevationScale, terrainColor, routeColor, routeCoordinates, routeBounds } =
    useConfiguratorStore()
  const geoRef = useRef<THREE.PlaneGeometry>(null)
  const { invalidate } = useThree()

  const res = terrain.resolution
  const eleRange = terrain.maxEle - terrain.minEle || 1
  const scaleFactor = ELEVATION_SCALE[elevationScale]
  const inShape = shape === 'circle' ? isInCircle : isInHexagon

  useEffect(() => {
    const geo = geoRef.current
    if (!geo) return
    const pos = geo.attributes.position as THREE.BufferAttribute

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const vi = i * res + j
        // nx: -1 (west) → +1 (east), nz: -1 (north) → +1 (south)
        const nx = (j / (res - 1)) * 2 - 1
        const nz = (i / (res - 1)) * 2 - 1
        const ele = terrain.grid[i][j]
        const h = inShape(nx, nz)
          ? ((ele - terrain.minEle) / eleRange) * scaleFactor
          : -SOCKEL_HEIGHT - 0.01

        pos.setZ(vi, h)
      }
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
    invalidate()
  }, [terrain, shape, elevationScale, res, eleRange, scaleFactor, inShape, invalidate])

  // Route tube — only rendered when bounds and coords are available
  const routeTubeGeometry = useMemo(() => {
    if (!routeCoordinates || !routeBounds) return null
    const { minLat, maxLat, minLng, maxLng } = routeBounds
    const sampled = subsample(routeCoordinates, MAX_ROUTE_POINTS)
    const points = sampled.map(([lng, lat]) => {
      const nx = -1 + ((lng - minLng) / (maxLng - minLng)) * 2
      const nz = -1 + ((maxLat - lat) / (maxLat - minLat)) * 2
      // sample elevation at nearest grid cell for realistic height
      const gi = Math.round(((maxLat - lat) / (maxLat - minLat)) * (res - 1))
      const gj = Math.round(((lng - minLng) / (maxLng - minLng)) * (res - 1))
      const clampedI = Math.max(0, Math.min(res - 1, gi))
      const clampedJ = Math.max(0, Math.min(res - 1, gj))
      const ele = terrain.grid[clampedI]?.[clampedJ] ?? terrain.minEle
      const h = inShape(nx, nz)
        ? ((ele - terrain.minEle) / eleRange) * scaleFactor + ROUTE_TUBE_RADIUS
        : 0
      return new THREE.Vector3(nx, h, nz)
    })
    if (points.length < 2) return null
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, sampled.length * 2, ROUTE_TUBE_RADIUS, 6, false)
  }, [routeCoordinates, routeBounds, terrain, elevationScale, shape, res, eleRange, scaleFactor, inShape])

  const sockelSegments = shape === 'circle' ? 64 : 6

  return (
    <group>
      {/* terrain surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry ref={geoRef} args={[2, 2, res - 1, res - 1]} />
        <meshStandardMaterial
          color={TERRAIN_COLOR[terrainColor] ?? '#888888'}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* sockel */}
      <mesh position={[0, -SOCKEL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[1.02, 1.02, SOCKEL_HEIGHT, sockelSegments]} />
        <meshStandardMaterial color={TERRAIN_COLOR[terrainColor] ?? '#888888'} />
      </mesh>

      {/* route tube */}
      {routeTubeGeometry && (
        <mesh geometry={routeTubeGeometry}>
          <meshStandardMaterial color={ROUTE_COLOR[routeColor] ?? '#ff6b35'} />
        </mesh>
      )}
    </group>
  )
}
```

**Critical notes:**
- `planeGeometry` not `PlaneGeometry` in JSX (lowercase for drei/R3F pass-through)
- `ref={geoRef}` on `<planeGeometry>` requires `THREE.PlaneGeometry` ref type
- `pos.setZ(vi, h)` raises vertex in world Y (because after rotation, local Z = world Y)
- Masked vertices go to `h = -SOCKEL_HEIGHT - 0.01` — sunk inside the sockel, invisible
- `invalidate()` is required since `frameloop="demand"` is set on the Canvas

- **Mirror**: Previous TV-011 implementation pattern (see session summary)
- **Validate**: `pnpm run build`

### Task 10: Update TerrainViewer to fetch and render TerrainMesh

- **File**: `apps/web/components/terrain-viewer/terrain-viewer.tsx`
- **Action**: UPDATE
- **Implement**: Replace the placeholder cylinder Scene with terrain fetch logic and `TerrainMesh`. Read `routeBounds` from the Zustand store; if null show a "no data" message. Fetch `/api/terrain/data` on mount; show skeleton while loading; show error in German on failure.

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { detectWebGL2 } from '@/lib/webgl/detect-webgl2'
import { useConfiguratorStore } from '@/lib/store/configurator'
import { TerrainMesh } from './terrain-mesh'
import type { TerrainData } from '@/types/terrain'

function detectQuality(): 'mobile' | 'preview' {
  if (typeof window === 'undefined') return 'preview'
  return window.innerWidth < 768 ? 'mobile' : 'preview'
}

function Scene({ terrain }: { terrain: TerrainData }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 8, 4]} intensity={1.2} castShadow={false} />
      <directionalLight position={[-4, 6, -4]} intensity={0.4} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={2}
        maxDistance={10}
      />
      <TerrainMesh terrain={terrain} />
    </>
  )
}

export function TerrainViewer() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)
  const [terrain, setTerrain] = useState<TerrainData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const routeBounds = useConfiguratorStore((s) => s.routeBounds)

  useEffect(() => {
    setWebglSupported(detectWebGL2())
  }, [])

  useEffect(() => {
    if (!routeBounds) return
    const { minLat, maxLat, minLng, maxLng } = routeBounds
    const quality = detectQuality()
    const params = new URLSearchParams({
      minLat: String(minLat),
      maxLat: String(maxLat),
      minLng: String(minLng),
      maxLng: String(maxLng),
      quality,
    })

    fetch(`/api/terrain/data?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTerrain(data.terrain)
        } else {
          setError('Geländedaten konnten nicht geladen werden.')
        }
      })
      .catch(() => {
        setError('Geländedaten konnten nicht geladen werden.')
      })
  }, [routeBounds])

  if (webglSupported === null || (routeBounds && !terrain && !error)) {
    return <div className="h-[480px] w-full rounded-xl bg-ink/5 animate-pulse" />
  }

  if (!webglSupported) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
        Dein Browser unterstützt WebGL nicht. Bitte versuche einen anderen Browser.
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
        {error}
      </div>
    )
  }

  if (!terrain) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
        Keine GPX-Daten vorhanden.
      </div>
    )
  }

  return (
    <div className="h-[480px] w-full rounded-xl overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ position: [0, 3, 5], fov: 45 }}
      >
        <Scene terrain={terrain} />
      </Canvas>
    </div>
  )
}
```
- **Mirror**: `apps/web/components/terrain-viewer/terrain-viewer.tsx` (current shape: webgl guard → Canvas)
- **Validate**: `pnpm run build && pnpm test`

---

## Validation

```bash
# Install sharp
pnpm add sharp --filter web

# Type check + build
pnpm run build

# Lint
pnpm run lint

# Tests (target: ≥ 63 tests passing — 48 baseline + 15 new)
pnpm test
```

---

## End-to-End Test

1. Start dev server: `pnpm run dev`
2. Navigate to `http://localhost:3000/product-configurator`
3. Upload a valid GPX file with elevation data
4. Advance to the map step → confirm route visible
5. Advance to the preview step (3D Vorschau)
6. **Expect**: skeleton shows briefly → terrain mesh appears
7. **Expect**: mesh has shape corresponding to configured shape (circle by default)
8. **Expect**: terrain has elevation variation (not flat)
9. **Expect**: orange route line visible on terrain surface
10. **Expect**: OrbitControls: drag to rotate, scroll to zoom
11. Open browser DevTools → Network tab → verify `/api/terrain/data` returns 200 with `success: true`

---

## Acceptance Criteria

- [ ] All 10 tasks completed
- [ ] `pnpm run build` passes with zero TypeScript errors
- [ ] `pnpm run lint` passes with zero errors
- [ ] `pnpm test` passes (≥ 63 tests)
- [ ] TerrainViewer shows real terrain elevation on preview step
- [ ] Shape mask correctly clips terrain to circle or hexagon
- [ ] Route tube renders on top of terrain surface
- [ ] Solid sockel visible below terrain shape
- [ ] Error state shown in German when API fails
- [ ] No placeholder cylinder remains
