# Plan: TV-013 — Buildings Toggle

## Summary

Add an optional buildings layer to the 3D terrain preview. The feature spans three layers: (1) a server-side Overpass API client that fetches OSM building footprints for a bounding box, (2) an extension of the terrain API route to return `BuildingFeature[]` when `?buildings=true` is requested, and (3) a `BuildingsMesh` React Three Fiber component that renders `ExtrudeGeometry` blocks per footprint. `TerrainViewer` lazily fetches building data when the toggle is first enabled and caches it locally — toggling off only hides the meshes, no re-fetch. A `BuildingsToggle` UI component (on/off) is wired into the preview step alongside `TerrainColorToggle`.

## User Story

As a customer,  
I want to optionally enable building footprints rendered as simple extruded blocks on the terrain,  
So that urban routes can show city context and I can choose between a clean landscape and an urban look.

## Metadata

| Field | Value |
|---|---|
| Type | NEW_CAPABILITY |
| Complexity | MEDIUM |
| Systems Affected | `types/terrain.ts`, `lib/buildings/`, `app/api/terrain/data/`, `components/terrain-viewer/`, `app/product-configurator/preview/` |
| Jira Issue | TV-013 |
| Blocks | — |

---

## Patterns to Follow

### Toggle Component (on/off variant)
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-color-toggle.tsx:1-36
'use client'
import { useConfiguratorStore } from '@/lib/store/configurator'

export function TerrainColorToggle() {
  const terrainColor = useConfiguratorStore((s) => s.terrainColor)
  const { updateConfig } = useConfiguratorStore()
  return (
    <div className="flex justify-center gap-2">
      {(['gray', 'black', 'white'] as const).map((c) => (
        <button key={c} type="button" onClick={() => updateConfig('terrainColor', c)}
          className={[
            'rounded px-5 py-2 text-sm font-medium transition-colors',
            terrainColor === c ? 'bg-ink text-white' : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink',
          ].join(' ')}>
          {LABELS[c]}
        </button>
      ))}
    </div>
  )
}
// Pattern: 2-option toggle with boolean can use same button map with true/false as const
```

### API Route Structure
```typescript
// SOURCE: apps/web/app/api/terrain/data/route.ts:1-46
// Pattern: read params → validate → call lib function → return NextResponse.json()
const qualityParam = searchParams.get('quality') ?? 'preview'
const quality: TerrainQuality = VALID_QUALITIES.has(qualityParam) ? (qualityParam as TerrainQuality) : 'preview'
try {
  const { grid, minEle, maxEle } = await fetchTerrainGrid(bounds, resolution, z)
  return NextResponse.json({ success: true, terrain: { grid, resolution, minEle, maxEle } })
} catch (err) {
  return NextResponse.json({ success: false, errorCode: 'TERRAIN_FETCH_ERROR', message: '...' }, { status: 502 })
}
```

### API Test Pattern
```typescript
// SOURCE: apps/web/app/api/terrain/data/route.test.ts:1-90
vi.mock('@/lib/terrain/tile-fetch')  // mock at top of file
function makeRequest(params: Record<string, string>): NextRequest { ... }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchTerrainGrid).mockResolvedValue(...) })
// Tests: call GET(makeRequest({...})), await res.json(), assert status + body shape
```

### 3D Mesh in TerrainMesh
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-mesh.tsx:162-168
// Pattern: conditional mesh rendering with useMemo geometry
{routeTubeGeometry && (
  <mesh geometry={routeTubeGeometry}>
    <meshStandardMaterial color={ROUTE_COLOR[routeColor] ?? '#ff6b35'} roughness={0.75} metalness={0} />
  </mesh>
)}
```

### Coordinate Mapping (terrain-mesh.tsx)
```typescript
// SOURCE: apps/web/components/terrain-viewer/terrain-mesh.tsx:103-115
// lng/lat → normalized nx/nz:
const nx = -1 + ((lng - minLng) / (maxLng - minLng)) * 2
const nz = -1 + ((maxLat - lat) / (maxLat - minLat)) * 2
// Grid index for terrain height sampling:
const gi = Math.max(0, Math.min(res - 1, Math.round(((maxLat - lat) / (maxLat - minLat)) * (res - 1))))
const gj = Math.max(0, Math.min(res - 1, Math.round(((lng - minLng) / (maxLng - minLng)) * (res - 1))))
const ele = terrain.grid[gi]?.[gj] ?? terrain.minEle
const h = ((ele - terrain.minEle) / eleRange) * scaleFactor
```

### TerrainViewer useEffect fetch pattern
```typescript
// SOURCE: apps/web/components/terrain-viewer/terrain-viewer.tsx:61-86
// Pattern: watch one dep → padBounds → build URLSearchParams → fetch → set state
useEffect(() => {
  if (!routeBounds) return
  const padded = padBounds(routeBounds)
  fetch(`/api/terrain/data?${params}`)
    .then(r => r.json())
    .then(data => { if (data.success) setTerrain(data.terrain); else setError('...') })
    .catch(() => setError('...'))
}, [routeBounds])
```

---

## Files to Change

| File | Action | Purpose |
|---|---|---|
| `apps/web/types/terrain.ts` | UPDATE | Add `BuildingFeature` type; extend `TerrainData` with optional `buildings` field |
| `apps/web/lib/buildings/fetch-buildings.ts` | CREATE | Overpass API client — fetches building footprints + heights for a bounding box |
| `apps/web/lib/buildings/fetch-buildings.test.ts` | CREATE | Unit tests for `fetchBuildings` (mock `global.fetch`) |
| `apps/web/app/api/terrain/data/route.ts` | UPDATE | Read `buildings` param; call `fetchBuildings`; include in response |
| `apps/web/app/api/terrain/data/route.test.ts` | UPDATE | Test `buildings=true` path and empty-result case |
| `apps/web/components/terrain-viewer/buildings-mesh.tsx` | CREATE | R3F component — renders `ExtrudeGeometry` blocks for each `BuildingFeature` |
| `apps/web/components/terrain-viewer/terrain-viewer.tsx` | UPDATE | Watch `buildingsEnabled`; lazy-fetch buildings; pass to Scene; show "no buildings" note |
| `apps/web/components/terrain-viewer/buildings-toggle.tsx` | CREATE | On/Off toggle for `buildingsEnabled` (mirrors TerrainColorToggle pattern) |
| `apps/web/app/product-configurator/preview/page.tsx` | UPDATE | Add `<BuildingsToggle />` between TerrainColorToggle and TerrainViewer |

---

## Risks

| Risk | Mitigation |
|---|---|
| Overpass API rate limits or downtime | Catch errors in `fetchBuildings`, return empty array; API returns `buildings: []` instead of error |
| Many buildings → poor performance | Limit to max 200 buildings; plan note: merging geometries is a TV-015 follow-up |
| Building footprints outside bounding shape | Skip buildings whose centroid is outside the circle/hexagon using `inShape()` — import the function |
| ExtrudeGeometry coordinate system | THREE.Shape is in local XY; after `rotation={[-PI/2, 0, 0]}`, shape lies in world XZ and extrudes upward along world Y — same rotation as the terrain plane |
| Buildings fetch triggered every `buildingsEnabled` toggle | Cache `buildings` in local state; only fetch when `buildings === null` AND `buildingsEnabled === true` |

---

## Tasks

Execute in order. Each task is independently verifiable.

---

### Task 1: Extend terrain types

- **File**: `apps/web/types/terrain.ts`
- **Action**: UPDATE
- **Implement**:
  ```typescript
  // Add before TerrainData:
  export type BuildingFeature = {
    footprint: [number, number][]  // [lng, lat] pairs, closed polygon (first === last)
    height: number                 // metres; default 10 when OSM tag absent
  }

  // Extend TerrainData:
  export type TerrainData = {
    grid: number[][]
    resolution: number
    minEle: number
    maxEle: number
    buildings?: BuildingFeature[]  // present only when ?buildings=true was requested
  }
  ```
  `TerrainApiResponse` is unchanged.
- **Validate**: `pnpm run build` — zero errors

---

### Task 2: Create Overpass API buildings fetcher

- **File**: `apps/web/lib/buildings/fetch-buildings.ts`
- **Action**: CREATE
- **Implement**:

  ```typescript
  import type { BuildingFeature } from '@/types/terrain'
  import type { RouteBounds } from '@/types/configurator'

  const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
  const DEFAULT_HEIGHT = 10  // metres
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

    const data = await response.json() as { elements: OverpassElement[] }
    const elements = data.elements ?? []

    // Build node-id → [lng, lat] lookup
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

      if (footprint.length < 4) continue  // degenerate / incomplete way

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
  ```

- **Mirror**: `apps/web/lib/terrain/tile-fetch.ts` — async function that calls an external HTTP API and throws on failure
- **Validate**: `pnpm run build`

---

### Task 3: Unit tests for fetchBuildings

- **File**: `apps/web/lib/buildings/fetch-buildings.test.ts`
- **Action**: CREATE
- **Implement**:

  ```typescript
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
    type: 'way', id: 100,
    nodes: [1, 2, 3, 4, 1],
    tags: { building: 'yes', 'building:levels': '3' },
  }

  beforeEach(() => { vi.restoreAllMocks() })

  it('returns buildings with correct height from building:levels', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(makeOverpassResponse([...NODES, WAY_CLOSED]) as Promise<Response>)
    const result = await fetchBuildings(BOUNDS)
    expect(result).toHaveLength(1)
    expect(result[0].height).toBe(9)  // 3 levels × 3 m
    expect(result[0].footprint).toHaveLength(5)
  })

  it('uses height tag when present', async () => {
    const way = { ...WAY_CLOSED, tags: { building: 'yes', height: '15' } }
    vi.spyOn(global, 'fetch').mockResolvedValue(makeOverpassResponse([...NODES, way]) as Promise<Response>)
    const result = await fetchBuildings(BOUNDS)
    expect(result[0].height).toBe(15)
  })

  it('falls back to DEFAULT_HEIGHT when no height tags', async () => {
    const way = { ...WAY_CLOSED, tags: { building: 'yes' } }
    vi.spyOn(global, 'fetch').mockResolvedValue(makeOverpassResponse([...NODES, way]) as Promise<Response>)
    const result = await fetchBuildings(BOUNDS)
    expect(result[0].height).toBe(10)
  })

  it('returns empty array when Overpass returns no ways', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(makeOverpassResponse([]) as Promise<Response>)
    const result = await fetchBuildings(BOUNDS)
    expect(result).toHaveLength(0)
  })

  it('throws when Overpass returns non-200', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 429 }) as Response)
    await expect(fetchBuildings(BOUNDS)).rejects.toThrow('Overpass 429')
  })

  it('skips ways with fewer than 4 resolved nodes', async () => {
    const incompleteWay = { ...WAY_CLOSED, nodes: [1, 2, 99] }  // node 99 missing from map
    vi.spyOn(global, 'fetch').mockResolvedValue(makeOverpassResponse([...NODES, incompleteWay]) as Promise<Response>)
    const result = await fetchBuildings(BOUNDS)
    expect(result).toHaveLength(0)
  })
  ```

- **Mirror**: `apps/web/app/api/terrain/data/route.test.ts:1-30` — vi.mock pattern, makeRequest helper, beforeEach reset
- **Validate**: `pnpm test` — all tests pass

---

### Task 4: Extend terrain API to return buildings

- **File**: `apps/web/app/api/terrain/data/route.ts`
- **Action**: UPDATE
- **Implement**:
  - Import `fetchBuildings` from `@/lib/buildings/fetch-buildings`
  - Read the `buildings` query param: `const withBuildings = searchParams.get('buildings') === 'true'`
  - After the existing `fetchTerrainGrid` call succeeds, conditionally fetch buildings:
    ```typescript
    let buildings: BuildingFeature[] | undefined
    if (withBuildings) {
      try {
        buildings = await fetchBuildings(bounds)
      } catch {
        buildings = []  // Overpass failure → empty, not a 502
      }
    }
    return NextResponse.json({
      success: true,
      terrain: { grid, resolution, minEle, maxEle, buildings },
    })
    ```
  - Add import for `BuildingFeature` from `@/types/terrain`
- **Mirror**: `apps/web/app/api/terrain/data/route.ts:30-42` — existing try/catch and response shape
- **Validate**: `pnpm run build`

---

### Task 5: Update terrain API route tests

- **File**: `apps/web/app/api/terrain/data/route.test.ts`
- **Action**: UPDATE
- **Implement**:
  - Add `vi.mock('@/lib/buildings/fetch-buildings')` at the top of the file (alongside existing mock)
  - Import `{ fetchBuildings }` after the mock declaration
  - In `beforeEach`, add: `vi.mocked(fetchBuildings).mockResolvedValue([])`
  - Add two new `it` blocks at the end of the `describe`:

    ```typescript
    it('includes buildings array when ?buildings=true', async () => {
      const mockBuildings = [{ footprint: [[11.5, 48.1], [11.51, 48.1], [11.51, 48.11], [11.5, 48.11], [11.5, 48.1]] as [number,number][], height: 9 }]
      vi.mocked(fetchBuildings).mockResolvedValueOnce(mockBuildings)
      const res = await GET(makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6', buildings: 'true' }))
      const body = (await res.json()) as TerrainApiResponse
      expect(res.status).toBe(200)
      if (body.success) {
        expect(body.terrain.buildings).toHaveLength(1)
        expect(body.terrain.buildings?.[0].height).toBe(9)
      }
    })

    it('returns empty buildings array when Overpass fails', async () => {
      vi.mocked(fetchBuildings).mockRejectedValueOnce(new Error('timeout'))
      const res = await GET(makeRequest({ minLat: '48.1', maxLat: '48.2', minLng: '11.5', maxLng: '11.6', buildings: 'true' }))
      const body = (await res.json()) as TerrainApiResponse
      expect(res.status).toBe(200)  // still 200 — Overpass failure is non-fatal
      if (body.success) expect(body.terrain.buildings).toEqual([])
    })
    ```

- **Mirror**: `apps/web/app/api/terrain/data/route.test.ts:25-70` — existing test case structure
- **Validate**: `pnpm test` — all tests pass

---

### Task 6: Create BuildingsMesh component

- **File**: `apps/web/components/terrain-viewer/buildings-mesh.tsx`
- **Action**: CREATE
- **Implement**:

  ```tsx
  'use client'

  import { useMemo } from 'react'
  import * as THREE from 'three'
  import { useConfiguratorStore } from '@/lib/store/configurator'
  import type { BuildingFeature, TerrainData } from '@/types/terrain'
  import type { RouteBounds } from '@/types/configurator'

  const BUILDING_COLOR: Record<string, string> = {
    gray: '#888888',
    black: '#1a1a1a',
    white: '#f5f5f5',
  }

  const ELEVATION_SCALE: Record<number, number> = { 1: 0.18, 2: 0.32, 3: 0.5 }
  const BUILDING_HEIGHT_SCALE = 0.003  // normalized units per metre; 10 m → 0.03 units

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

  export function BuildingsMesh({
    buildings,
    terrainBounds,
    terrain,
  }: {
    buildings: BuildingFeature[]
    terrainBounds: RouteBounds
    terrain: TerrainData
  }) {
    const { buildingColor, elevationScale, shape } = useConfiguratorStore()
    const scaleFactor = ELEVATION_SCALE[elevationScale] ?? 0.4
    const eleRange = terrain.maxEle - terrain.minEle || 1
    const inShape = shape === 'circle' ? isInCircle : isInHexagon

    const meshData = useMemo(() => {
      const { minLat, maxLat, minLng, maxLng } = terrainBounds
      const res = terrain.resolution

      return buildings.flatMap((building) => {
        // Compute centroid in normalised space
        const pts = building.footprint.map(([lng, lat]) => ({
          nx: -1 + ((lng - minLng) / (maxLng - minLng)) * 2,
          nz: -1 + ((maxLat - lat) / (maxLat - minLat)) * 2,
        }))

        const cx = pts.reduce((s, p) => s + p.nx, 0) / pts.length
        const cz = pts.reduce((s, p) => s + p.nz, 0) / pts.length

        // Skip buildings whose centroid is outside the bounding shape
        if (!inShape(cx, cz)) return []

        // Sample terrain height at centroid
        const gi = Math.max(0, Math.min(res - 1, Math.round(((maxLat - (terrainBounds.minLat + (cz + 1) / 2 * (maxLat - terrainBounds.minLat))) / (maxLat - terrainBounds.minLat)) * (res - 1))))
        const gj = Math.max(0, Math.min(res - 1, Math.round(((cx + 1) / 2) * (res - 1))))
        const ele = terrain.grid[gi]?.[gj] ?? terrain.minEle
        const baseH = ((ele - terrain.minEle) / eleRange) * scaleFactor

        // Build THREE.Shape in local XY (after rotation matches terrain plane)
        // local X = nx, local Y = -nz (so world XZ = shape XY after Rx(-90°))
        const threeShape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.nx, -p.nz)))

        const depth = Math.max(building.height, 3) * BUILDING_HEIGHT_SCALE
        const geometry = new THREE.ExtrudeGeometry(threeShape, { depth, bevelEnabled: false })

        return [{ geometry, baseH }]
      })
    }, [buildings, terrainBounds, terrain, scaleFactor, eleRange, inShape])

    const color = BUILDING_COLOR[buildingColor] ?? '#888888'

    return (
      <>
        {meshData.map(({ geometry, baseH }, i) => (
          <mesh
            key={i}
            geometry={geometry}
            position={[0, baseH, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
          </mesh>
        ))}
      </>
    )
  }
  ```

  **Coordinate system note**: The terrain plane uses `rotation={[-Math.PI/2, 0, 0]}`. After this rotation, local XY maps to world XZ and local Z extrudes upward along world Y. The `THREE.Shape` is therefore constructed in (nx, −nz) space so that after the same rotation it aligns with the terrain.

  **Terrain height sampling**: The centroid gi/gj computation uses `terrainBounds` (the padded bounds) — not raw `minLat/maxLat`. Fix the computation to consistently use `terrainBounds`:
  ```typescript
  const gi = Math.max(0, Math.min(res - 1, Math.round(((maxLat - cz_lat) / (maxLat - minLat)) * (res - 1))))
  ```
  where `cz_lat = minLat + (1 - (cz + 1) / 2) * (maxLat - minLat)` — but it's simpler to store the lat/lng centroid directly. Restructure the loop so you retain the original `[lng, lat]` centroid before converting:
  ```typescript
  const centLng = building.footprint.reduce((s, [lng]) => s + lng, 0) / building.footprint.length
  const centLat = building.footprint.reduce((s, [, lat]) => s + lat, 0) / building.footprint.length
  const gi = Math.max(0, Math.min(res - 1, Math.round(((maxLat - centLat) / (maxLat - minLat)) * (res - 1))))
  const gj = Math.max(0, Math.min(res - 1, Math.round(((centLng - minLng) / (maxLng - minLng)) * (res - 1))))
  ```

- **Mirror**: `apps/web/components/terrain-viewer/terrain-mesh.tsx:99-170` — geometry building in useMemo, conditional mesh rendering
- **Validate**: `pnpm run build`

---

### Task 7: Update TerrainViewer to fetch and render buildings

- **File**: `apps/web/components/terrain-viewer/terrain-viewer.tsx`
- **Action**: UPDATE
- **Implement** the following changes:

  **Imports** — add:
  ```typescript
  import { BuildingsMesh } from './buildings-mesh'
  import type { BuildingFeature } from '@/types/terrain'
  ```

  **Scene component** — add `buildings` and `buildingsEnabled` props:
  ```tsx
  function Scene({
    terrain,
    terrainBounds,
    buildings,
    buildingsEnabled,
  }: {
    terrain: TerrainData
    terrainBounds: RouteBounds
    buildings: BuildingFeature[] | null
    buildingsEnabled: boolean
  }) {
    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 8, 4]} intensity={1.2} castShadow={false} />
        <directionalLight position={[-4, 6, -4]} intensity={0.4} />
        <OrbitControls makeDefault enablePan={false} enableDamping minDistance={2} maxDistance={10} />
        <TerrainMesh terrain={terrain} terrainBounds={terrainBounds} />
        {buildingsEnabled && buildings && buildings.length > 0 && (
          <BuildingsMesh buildings={buildings} terrainBounds={terrainBounds} terrain={terrain} />
        )}
      </>
    )
  }
  ```

  **TerrainViewer component** — add local state and buildings fetch effect:
  ```typescript
  const buildingsEnabled = useConfiguratorStore((s) => s.buildingsEnabled)
  const [buildings, setBuildings] = useState<BuildingFeature[] | null>(null)
  const [buildingsLoading, setBuildingsLoading] = useState(false)

  // Fetch buildings lazily when enabled for the first time (or when bounds change)
  useEffect(() => {
    if (!buildingsEnabled || !terrainBounds) return
    // Already have data for these bounds — do not re-fetch
    if (buildings !== null) return
    setBuildingsLoading(true)
    const { minLat, maxLat, minLng, maxLng } = terrainBounds
    const params = new URLSearchParams({
      minLat: String(minLat), maxLat: String(maxLat),
      minLng: String(minLng), maxLng: String(maxLng),
      buildings: 'true',
    })
    fetch(`/api/terrain/data?${params}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setBuildings(data.terrain.buildings ?? []) })
      .catch(() => setBuildings([]))  // treat fetch failure as no buildings
      .finally(() => setBuildingsLoading(false))
  }, [buildingsEnabled, terrainBounds, buildings])

  // Reset buildings cache when routeBounds changes (new GPX uploaded)
  useEffect(() => {
    setBuildings(null)
  }, [routeBounds])
  ```

  **Canvas render** — pass new props to Scene:
  ```tsx
  <Canvas dpr={[1, 2]} frameloop="demand" camera={{ position: [0, 3, 5], fov: 45 }}>
    <Scene
      terrain={terrain}
      terrainBounds={terrainBounds}
      buildings={buildings}
      buildingsEnabled={buildingsEnabled}
    />
  </Canvas>
  ```

  **"No buildings" message** — show below the canvas when enabled + empty + not loading:
  ```tsx
  {buildingsEnabled && !buildingsLoading && buildings !== null && buildings.length === 0 && (
    <p className="mt-2 text-center text-xs text-ink/40">
      Für dieses Gebiet sind keine Gebäudedaten verfügbar.
    </p>
  )}
  ```

- **Mirror**: `apps/web/components/terrain-viewer/terrain-viewer.tsx:57-86` — existing useEffect fetch pattern; `apps/web/components/map-viewer/out-of-bounds-warning.tsx` — inline message below map
- **Validate**: `pnpm run build`

---

### Task 8: Create BuildingsToggle component

- **File**: `apps/web/components/terrain-viewer/buildings-toggle.tsx`
- **Action**: CREATE
- **Implement**:

  ```tsx
  'use client'

  import { useConfiguratorStore } from '@/lib/store/configurator'

  export function BuildingsToggle() {
    const buildingsEnabled = useConfiguratorStore((s) => s.buildingsEnabled)
    const { updateConfig } = useConfiguratorStore()

    return (
      <div className="flex justify-center gap-2">
        {([false, true] as const).map((on) => (
          <button
            key={String(on)}
            type="button"
            onClick={() => updateConfig('buildingsEnabled', on)}
            className={[
              'rounded px-5 py-2 text-sm font-medium transition-colors',
              buildingsEnabled === on
                ? 'bg-ink text-white'
                : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink',
            ].join(' ')}
          >
            {on ? 'Mit Gebäuden' : 'Ohne Gebäude'}
          </button>
        ))}
      </div>
    )
  }
  ```

- **Mirror**: `apps/web/components/terrain-viewer/terrain-color-toggle.tsx:1-36`
- **Validate**: `pnpm run build`

---

### Task 9: Wire BuildingsToggle into the preview step

- **File**: `apps/web/app/product-configurator/preview/page.tsx`
- **Action**: UPDATE
- **Implement**: Add `BuildingsToggle` import and render it in a `<div className="mb-4">` between `TerrainColorToggle` and `TerrainViewer`:

  ```tsx
  import { TerrainViewer } from '@/components/terrain-viewer/terrain-viewer'
  import { TerrainColorToggle } from '@/components/terrain-viewer/terrain-color-toggle'
  import { BuildingsToggle } from '@/components/terrain-viewer/buildings-toggle'

  export default function PreviewStep() {
    return (
      <div className="py-6">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-ink">3D-Vorschau</h2>
          <p className="mt-1 text-sm text-ink/60">
            Rotiere das Modell mit der Maus oder per Touch-Geste.
          </p>
        </div>
        <div className="mb-4">
          <TerrainColorToggle />
        </div>
        <div className="mb-4">
          <BuildingsToggle />
        </div>
        <TerrainViewer />
      </div>
    )
  }
  ```

- **Mirror**: `apps/web/app/product-configurator/map/page.tsx:1-24` — pattern: each control in its own `mb-4` div
- **Validate**: `pnpm run build`

---

## Validation

```bash
# From project root
pnpm run build      # zero TypeScript errors

pnpm run lint       # zero lint errors

pnpm test           # all tests pass (8 new test cases)

pnpm run dev        # navigate to /product-configurator/preview
```

Manual checks (requires a GPX file with real data loaded):
- "Ohne Gebäude / Mit Gebäuden" toggle renders below "Grau / Schwarz / Weiß"
- Default: "Ohne Gebäude" active, no buildings in scene
- Clicking "Mit Gebäuden": loading state → buildings appear as extruded blocks OR "Für dieses Gebiet sind keine Gebäudedaten verfügbar." message
- Clicking "Ohne Gebäude": buildings disappear instantly, no new network request
- Clicking "Mit Gebäuden" again: buildings reappear instantly (cached), no new network request
- Changing `buildingColor` via Zustand: building material color updates immediately

---

## Acceptance Criteria

- [ ] Default state: "Ohne Gebäude" selected, no buildings rendered in scene
- [ ] Toggling "Mit Gebäuden": building extruded blocks appear at correct map positions
- [ ] Region with no OSM buildings: "Für dieses Gebiet sind keine Gebäudedaten verfügbar." shown
- [ ] `buildingColor` change updates building material in real time
- [ ] Toggling off: buildings removed from scene, no API re-fetch
- [ ] `pnpm run build` exits 0 with zero TypeScript errors
- [ ] `pnpm test` passes (including 8 new test cases: 6 for fetchBuildings, 2 for terrain API)
