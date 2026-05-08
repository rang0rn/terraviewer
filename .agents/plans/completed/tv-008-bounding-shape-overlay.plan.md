# Plan: TV-008 Bounding Shape Overlay (Circle & Hexagon)

## Summary

Add a circle/hexagon bounding shape overlay to the 2D Map step. A `generateShapeGeoJSON()` utility (Turf.js `circle()` with `steps=64` or `steps=6`) generates a GeoJSON Polygon centred on the route bounds midpoint; MapLibre renders it as semi-transparent fill + stroke layers. The shape toggle (two buttons: Kreis / Hexagon) lives in a new `ShapeToggle` client component placed above the map. When the user switches shapes, a second `useEffect` in `MapViewer` calls `source.setData()` to swap the polygon without re-initialising the map. `shape` is already in `ConfiguratorState` (default `'circle'`) so no type or store changes are needed.

## User Story

As a customer
I want to select between a circle and a hexagon bounding shape on the 2D map
So that I can choose the visual style of my physical terrain insert before seeing the 3D preview

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | MEDIUM |
| Systems Affected | `features/map`, `components/map-viewer`, `app/product-configurator/map` |
| Jira Issue | TV-008 |

---

## Patterns to Follow

### Feature utility — pure function, exported, with test file
```ts
// SOURCE: apps/web/features/map/route-geojson.ts:1-6
import type { TrackPoint } from '@/lib/gpx/parser'

// GeoJSON requires [longitude, latitude] — reversed from GPX lat/lon order.
export function trackPointsToLngLat(points: TrackPoint[]): [number, number][] {
  return points.map((p) => [p.lng, p.lat])
}
```

### Store selector reads in MapViewer
```ts
// SOURCE: apps/web/components/map-viewer/map-viewer.tsx:27-29
const routeCoordinates = useConfiguratorStore((s) => s.routeCoordinates)
const routeBounds = useConfiguratorStore((s) => s.routeBounds)
const routeColor = useConfiguratorStore((s) => s.routeColor)
// → add: const shape = useConfiguratorStore((s) => s.shape)
```

### MapLibre source + layer registration (map.on('load') block)
```ts
// SOURCE: apps/web/components/map-viewer/map-viewer.tsx:58-73
map.addSource('route', {
  type: 'geojson',
  data: { type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoordinates }, properties: {} },
})
map.addLayer({ id: 'route', type: 'line', source: 'route', ... })
// → same pattern for 'shape' source + 'shape-fill' fill layer + 'shape-stroke' line layer
```

### Vitest test structure
```ts
// SOURCE: apps/web/features/map/route-geojson.test.ts:1-7
import { describe, it, expect } from 'vitest'
import { trackPointsToLngLat } from './route-geojson'

describe('trackPointsToLngLat', () => {
  it('returns an empty array for no points', () => {
    expect(trackPointsToLngLat([])).toEqual([])
  })
```

### Button active/inactive pattern
```tsx
// SOURCE: apps/web/components/ui/step-navigation.tsx:40-50
className="rounded bg-ink px-6 py-2 text-sm font-medium text-white disabled:opacity-40"
// inactive reference from stepper: "border border-ink/20 text-ink/40"
// → active: bg-ink text-white  |  inactive: border border-ink/20 text-ink/60 hover:border-ink/40
```

### Client component with Zustand write
```tsx
// SOURCE: apps/web/components/upload/gpx-dropzone.tsx:1-18
'use client'
import { useConfiguratorStore } from '@/lib/store/configurator'
const { updateConfig } = useConfiguratorStore()
```

---

## Shape Geometry Design

**Center**: midpoint of `routeBounds` — `[(minLng+maxLng)/2, (minLat+maxLat)/2]`

**Radius**: half-diagonal of bounding box converted to km via flat-earth approximation, with 10% margin so the shape always fully contains the route:
```ts
const latSpanKm  = (bounds.maxLat - bounds.minLat) * 111
const lngSpanKm  = (bounds.maxLng - bounds.minLng) * 111 * Math.cos(midLat * (Math.PI / 180))
const radiusKm   = Math.max(Math.sqrt(latSpanKm ** 2 + lngSpanKm ** 2) / 2 * 1.1, 0.1)
```
Minimum 0.1 km guards against a zero-extent route (single trackpoint).

**GeoJSON generation**: `circle([centerLng, centerLat], radiusKm, { steps, units: 'kilometers' })`
- Circle: `steps: 64` → smooth disc
- Hexagon: `steps: 6` → regular 6-sided polygon (turf places vertices at equal geodesic angles)

**MapLibre layers**:
| Layer id | Type | Paint |
|----------|------|-------|
| `shape-fill` | fill | `fill-color: #18181b`, `fill-opacity: 0.08` |
| `shape-stroke` | line | `line-color: #18181b`, `line-width: 2`, `line-opacity: 0.6` |

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/package.json` | UPDATE | Add `@turf/circle` dependency |
| `apps/web/features/map/shape-geojson.ts` | CREATE | `generateShapeGeoJSON()` utility |
| `apps/web/features/map/shape-geojson.test.ts` | CREATE | Unit tests for shape geometry |
| `apps/web/components/map-viewer/map-viewer.tsx` | UPDATE | Add shape overlay layers; shape-update effect |
| `apps/web/components/map-viewer/shape-toggle.tsx` | CREATE | Circle / Hexagon toggle buttons (client component) |
| `apps/web/app/product-configurator/map/page.tsx` | UPDATE | Render `<ShapeToggle />` above `<MapViewer />` |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Shape update fires before `map.on('load')` completes | Gate the update effect on a `mapLoadedRef` boolean |
| `getSource('shape')` unavailable if routeBounds is null on load | Guard: only add source when `routeBounds` is truthy; effect also guards |
| `@turf/circle` adds significant bundle weight | Only the single `@turf/circle` package (~12 kB gzipped) — acceptable for MVP |
| Hexagon orientation — pointy-top vs flat-top | Turf places first vertex at north (bearing 0); cosmetically fine for MVP |
| `eslint react-hooks/exhaustive-deps` warning on second useEffect | Add targeted eslint-disable comment (same pattern as existing map effect) |

---

## Tasks

### Task 1: Install @turf/circle

- **Action**: Run `pnpm add @turf/circle` from `apps/web/`
- **Validate**: `pnpm run build` — confirm no peer-dep errors; check `package.json` for entry

### Task 2: Create shape-geojson utility

- **File**: `apps/web/features/map/shape-geojson.ts`
- **Action**: CREATE
- **Implement**:
  ```ts
  import circle from '@turf/circle'
  import type { Shape, RouteBounds } from '@/types/configurator'

  export function generateShapeGeoJSON(bounds: RouteBounds, shape: Shape) {
    const centerLng = (bounds.minLng + bounds.maxLng) / 2
    const centerLat = (bounds.minLat + bounds.maxLat) / 2
    const latSpanKm = (bounds.maxLat - bounds.minLat) * 111
    const lngSpanKm =
      (bounds.maxLng - bounds.minLng) * 111 * Math.cos(centerLat * (Math.PI / 180))
    const radiusKm = Math.max(
      (Math.sqrt(latSpanKm ** 2 + lngSpanKm ** 2) / 2) * 1.1,
      0.1,
    )
    const steps = shape === 'circle' ? 64 : 6
    return circle([centerLng, centerLat], radiusKm, { steps, units: 'kilometers' })
  }
  ```
- **Mirror**: `apps/web/features/map/route-geojson.ts:1-6`
- **Validate**: `pnpm run build`

### Task 3: Unit tests for shape-geojson

- **File**: `apps/web/features/map/shape-geojson.test.ts`
- **Action**: CREATE
- **Implement** (5 cases):
  ```ts
  import { describe, it, expect } from 'vitest'
  import { generateShapeGeoJSON } from './shape-geojson'

  const BOUNDS = { minLat: 48.0, maxLat: 48.1, minLng: 11.5, maxLng: 11.7 }

  describe('generateShapeGeoJSON', () => {
    it('returns a GeoJSON Feature with Polygon geometry', () => {
      const result = generateShapeGeoJSON(BOUNDS, 'circle')
      expect(result.type).toBe('Feature')
      expect(result.geometry.type).toBe('Polygon')
    })

    it('circle has 65 coordinate pairs (64 steps + closing)', () => {
      const result = generateShapeGeoJSON(BOUNDS, 'circle')
      expect(result.geometry.coordinates[0]).toHaveLength(65)
    })

    it('hexagon has 7 coordinate pairs (6 steps + closing)', () => {
      const result = generateShapeGeoJSON(BOUNDS, 'hexagon')
      expect(result.geometry.coordinates[0]).toHaveLength(7)
    })

    it('center of the polygon is near the midpoint of bounds', () => {
      const result = generateShapeGeoJSON(BOUNDS, 'circle')
      const coords = result.geometry.coordinates[0]
      const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length
      const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length
      expect(avgLng).toBeCloseTo((BOUNDS.minLng + BOUNDS.maxLng) / 2, 1)
      expect(avgLat).toBeCloseTo((BOUNDS.minLat + BOUNDS.maxLat) / 2, 1)
    })

    it('does not throw for a zero-extent route (single trackpoint bounds)', () => {
      const zeroBounds = { minLat: 48.1, maxLat: 48.1, minLng: 11.5, maxLng: 11.5 }
      expect(() => generateShapeGeoJSON(zeroBounds, 'circle')).not.toThrow()
    })
  })
  ```
- **Mirror**: `apps/web/features/map/route-geojson.test.ts:1-29`
- **Validate**: `pnpm test`

### Task 4: Update MapViewer — shape overlay layers + update effect

- **File**: `apps/web/components/map-viewer/map-viewer.tsx`
- **Action**: UPDATE
- **Implement** the following changes in order:

  **4a — imports** (add after existing imports):
  ```ts
  import { generateShapeGeoJSON } from '@/features/map/shape-geojson'
  ```

  **4b — store selector** (add after `routeColor` selector):
  ```ts
  const shape = useConfiguratorStore((s) => s.shape)
  ```

  **4c — mapLoaded ref** (add after `mapRef` declaration):
  ```ts
  const mapLoadedRef = useRef(false)
  ```

  **4d — inside `map.on('load')` callback**, after the route `addLayer` call and before `map.fitBounds`, add shape source and layers (guard with `routeBounds` check):
  ```ts
  if (routeBounds) {
    map.addSource('shape', {
      type: 'geojson',
      data: generateShapeGeoJSON(routeBounds, shape),
    })
    map.addLayer({
      id: 'shape-fill',
      type: 'fill',
      source: 'shape',
      paint: { 'fill-color': '#18181b', 'fill-opacity': 0.08 },
    })
    map.addLayer({
      id: 'shape-stroke',
      type: 'line',
      source: 'shape',
      paint: { 'line-color': '#18181b', 'line-width': 2, 'line-opacity': 0.6 },
    })
  }
  mapLoadedRef.current = true
  ```
  Note: the `mapLoadedRef.current = true` line must come **after** all source/layer registrations so the update effect only fires `setData` once sources exist.

  **4e — second useEffect** for shape changes (add after the existing `useEffect`, before the conditional return):
  ```ts
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current || !routeBounds) return
    ;(map.getSource('shape') as maplibregl.GeoJSONSource).setData(
      generateShapeGeoJSON(routeBounds, shape),
    )
  }, [shape, routeBounds]) // eslint-disable-line react-hooks/exhaustive-deps
  ```

- **Mirror**: `apps/web/components/map-viewer/map-viewer.tsx:55-89` — existing `map.on('load')` and `useEffect` patterns
- **Validate**: `pnpm run build`

### Task 5: Create ShapeToggle component

- **File**: `apps/web/components/map-viewer/shape-toggle.tsx`
- **Action**: CREATE
- **Implement**:
  ```tsx
  'use client'

  import { useConfiguratorStore } from '@/lib/store/configurator'
  import type { Shape } from '@/types/configurator'

  const LABELS: Record<Shape, string> = {
    circle: 'Kreis',
    hexagon: 'Hexagon',
  }

  export function ShapeToggle() {
    const shape = useConfiguratorStore((s) => s.shape)
    const { updateConfig } = useConfiguratorStore()

    return (
      <div className="flex justify-center gap-2">
        {(['circle', 'hexagon'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateConfig('shape', s)}
            className={[
              'rounded px-5 py-2 text-sm font-medium transition-colors',
              shape === s
                ? 'bg-ink text-white'
                : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink',
            ].join(' ')}
          >
            {LABELS[s]}
          </button>
        ))}
      </div>
    )
  }
  ```
- **Mirror**: `apps/web/components/upload/gpx-dropzone.tsx:114-120` — button styling; `apps/web/components/map-viewer/map-viewer.tsx:1-7` — `'use client'` + Zustand pattern
- **Validate**: `pnpm run build`

### Task 6: Update map step page to render ShapeToggle

- **File**: `apps/web/app/product-configurator/map/page.tsx`
- **Action**: UPDATE
- **Implement**:
  ```tsx
  import { MapViewer } from '@/components/map-viewer/map-viewer'
  import { ShapeToggle } from '@/components/map-viewer/shape-toggle'

  export default function MapStep() {
    return (
      <div className="py-6">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-ink">Route prüfen</h2>
          <p className="mt-1 text-sm text-ink/60">
            Prüfe deine Route und wähle die gewünschte Ausschnittform.
          </p>
        </div>
        <div className="mb-4">
          <ShapeToggle />
        </div>
        <MapViewer />
      </div>
    )
  }
  ```
- **Mirror**: `apps/web/app/product-configurator/map/page.tsx:1-15` — current structure; keep as server component (ShapeToggle and MapViewer are the client boundaries)
- **Validate**: `pnpm run build`

---

## Validation

```bash
# From repo root
pnpm run build   # type check + Next.js build

pnpm run lint    # ESLint

pnpm test        # Vitest — should show ≥ 5 new shape-geojson cases; all 36 prior pass
```

---

## Acceptance Criteria

- [ ] Circle and Hexagon buttons visible on the 2D Map step
- [ ] Clicking Hexagon swaps the overlay polygon to a 6-sided shape without map reload
- [ ] Clicking Circle restores the smooth disc overlay
- [ ] Active button has solid `bg-ink` style; inactive has outlined style
- [ ] Overlay is semi-transparent fill + visible stroke so the route polyline shows through
- [ ] `shape` in Zustand persists when navigating back to the map step
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (≥ 5 new shape-geojson cases, all 36 prior pass)
- [ ] Responsive on 375 px — buttons and map fill width without overflow
