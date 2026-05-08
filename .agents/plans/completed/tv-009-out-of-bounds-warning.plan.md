# Plan: TV-009 Out-of-Bounds Warning

## Summary

Show a non-blocking amber warning banner on the 2D Map step when any route trackpoint falls outside the current bounding shape. An `isRouteOutOfBounds()` utility uses `@turf/boolean-point-in-polygon` to test each route coordinate against the shape polygon. The `OutOfBoundsWarning` client component derives the result via `useMemo` from Zustand store values — it re-evaluates automatically whenever `shape` changes (circle vs hexagon can have different containment). No zoom event listener is needed because the shape polygon is geographically fixed (derived from route bounds, not the map viewport).

> **Note on AC #3 (zoom re-evaluation)**: The story says the check re-evaluates on zoom. In our implementation the shape is fixed to route bounds — zooming does not change the polygon. The check re-evaluates on `shape` change, which is the meaningful interactive trigger. This deviation is intentional and consistent with TV-008's fixed-shape design.

## User Story

As a customer
I want to be notified when my route extends outside the selected bounding shape
So that I can choose a different shape and avoid ordering a poster with a clipped route

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | LOW |
| Systems Affected | `features/map`, `components/map-viewer`, `app/product-configurator/map` |
| Jira Issue | TV-009 |

---

## Patterns to Follow

### Alert/warning banner markup
```tsx
// SOURCE: apps/web/components/upload/gpx-dropzone.tsx:135-139
{uploadState === 'error' && errorMessage && (
  <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </p>
)}
// → use amber colour scale (bg-amber-50 text-amber-800) — informational, not an error
```

### Feature utility — pure exported function
```ts
// SOURCE: apps/web/features/map/shape-geojson.ts:1-16
import circle from '@turf/circle'
import type { Shape, RouteBounds } from '@/types/configurator'

export function generateShapeGeoJSON(bounds: RouteBounds, shape: Shape) { ... }
// → same pattern: import from @turf/*, export one named function
```

### Client component that reads multiple store values
```tsx
// SOURCE: apps/web/components/map-viewer/map-viewer.tsx:27-31
const routeCoordinates = useConfiguratorStore((s) => s.routeCoordinates)
const routeBounds      = useConfiguratorStore((s) => s.routeBounds)
const shape            = useConfiguratorStore((s) => s.shape)
// → read routeCoordinates + routeBounds + shape; guard on null
```

### useMemo for derived computation
```tsx
// Pattern: derive a value from multiple store reads without a useEffect
import { useMemo } from 'react'
const result = useMemo(() => expensiveFn(a, b), [a, b])
```

### Vitest test structure
```ts
// SOURCE: apps/web/features/map/shape-geojson.test.ts:1-8
import { describe, it, expect } from 'vitest'
import { generateShapeGeoJSON } from './shape-geojson'

const BOUNDS = { minLat: 48.0, maxLat: 48.1, minLng: 11.5, maxLng: 11.7 }

describe('generateShapeGeoJSON', () => {
  it('returns a GeoJSON Feature with Polygon geometry', () => { ... })
```

---

## Out-of-Bounds Check Design

**Function**: `isRouteOutOfBounds(coords: [number, number][], shapePoly: Feature<Polygon>): boolean`

Uses `booleanPointInPolygon(coord, shapePoly)` from `@turf/boolean-point-in-polygon` per coordinate. Returns `true` (is out-of-bounds) as soon as any coordinate fails the containment test — short-circuits via `Array.some`.

```ts
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import type { Feature, Polygon } from 'geojson'

export function isRouteOutOfBounds(
  coords: [number, number][],
  shapePoly: Feature<Polygon>,
): boolean {
  return coords.some((coord) => !booleanPointInPolygon(coord, shapePoly))
}
```

**Why `some` not `every`**: We want `true` (warning shown) when *any* point is outside — `some` short-circuits at the first violation, which is efficient for long routes.

**Why point-by-point instead of `booleanWithin(lineString, polygon)`**: Clearer semantics, simpler to test, same performance for MVP route sizes.

---

## Warning UI Design

**Placement**: Between `<ShapeToggle />` and `<MapViewer />` in the map page, inside a `mb-4` wrapper.

**Style**: Amber banner — clearly informational, distinct from the red error banner in the upload step:
```
rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800
```

**German copy**:
> Teile deiner Route liegen außerhalb der gewählten Ausschnittform und werden auf dem Poster abgeschnitten.

**Behaviour**: Renders `null` when no warning needed — no layout shift when route is fully inside.

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/package.json` | UPDATE | Add `@turf/boolean-point-in-polygon` dependency |
| `apps/web/features/map/out-of-bounds.ts` | CREATE | `isRouteOutOfBounds()` pure utility |
| `apps/web/features/map/out-of-bounds.test.ts` | CREATE | Unit tests |
| `apps/web/components/map-viewer/out-of-bounds-warning.tsx` | CREATE | Warning banner component |
| `apps/web/app/product-configurator/map/page.tsx` | UPDATE | Render `<OutOfBoundsWarning />` between toggle and map |

---

## Risks

| Risk | Mitigation |
|------|------------|
| `@turf/boolean-point-in-polygon` v7 default import differs from v6 | Verify import after install; same pattern as `@turf/circle` default import |
| `Feature<Polygon>` type from `@turf/circle` may need explicit cast | Use `import type { Feature, Polygon } from 'geojson'` — standard GeoJSON types |
| Re-renders on every Zustand tick | `useMemo([routeCoordinates, routeBounds, shape])` prevents recomputing on unrelated state updates |
| Warning obscures map on small screens | Render above map, not as overlay; its natural height pushes map down |

---

## Tasks

### Task 1: Install @turf/boolean-point-in-polygon

- **Action**: Run `pnpm add @turf/boolean-point-in-polygon` from `apps/web/`
- **Validate**: `pnpm run build` — confirm no peer-dep errors

### Task 2: Create out-of-bounds utility

- **File**: `apps/web/features/map/out-of-bounds.ts`
- **Action**: CREATE
- **Implement**:
  ```ts
  import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
  import type { Feature, Polygon } from 'geojson'

  export function isRouteOutOfBounds(
    coords: [number, number][],
    shapePoly: Feature<Polygon>,
  ): boolean {
    return coords.some((coord) => !booleanPointInPolygon(coord, shapePoly))
  }
  ```
- **Mirror**: `apps/web/features/map/shape-geojson.ts:1-16` — same pure-utility pattern
- **Validate**: `pnpm run build`

### Task 3: Unit tests for out-of-bounds utility

- **File**: `apps/web/features/map/out-of-bounds.test.ts`
- **Action**: CREATE
- **Implement** (5 cases):
  ```ts
  import { describe, it, expect } from 'vitest'
  import { isRouteOutOfBounds } from './out-of-bounds'
  import { generateShapeGeoJSON } from './shape-geojson'

  const BOUNDS = { minLat: 48.0, maxLat: 48.1, minLng: 11.5, maxLng: 11.7 }

  describe('isRouteOutOfBounds', () => {
    it('returns false when all coords are inside the shape', () => {
      const shape = generateShapeGeoJSON(BOUNDS, 'circle')
      // centroid — guaranteed inside
      const coords: [number, number][] = [[11.6, 48.05]]
      expect(isRouteOutOfBounds(coords, shape)).toBe(false)
    })

    it('returns true when any coord is outside the shape', () => {
      const shape = generateShapeGeoJSON(BOUNDS, 'circle')
      // far-away point guaranteed outside
      const coords: [number, number][] = [[11.6, 48.05], [0, 0]]
      expect(isRouteOutOfBounds(coords, shape)).toBe(true)
    })

    it('returns false for an empty coords array (no points = no violations)', () => {
      const shape = generateShapeGeoJSON(BOUNDS, 'circle')
      expect(isRouteOutOfBounds([], shape)).toBe(false)
    })

    it('returns true when a single coord is outside the shape', () => {
      const shape = generateShapeGeoJSON(BOUNDS, 'circle')
      const coords: [number, number][] = [[0, 0]]
      expect(isRouteOutOfBounds(coords, shape)).toBe(true)
    })

    it('hexagon shape: route centroid is inside', () => {
      const shape = generateShapeGeoJSON(BOUNDS, 'hexagon')
      const coords: [number, number][] = [[11.6, 48.05]]
      expect(isRouteOutOfBounds(coords, shape)).toBe(false)
    })
  })
  ```
- **Mirror**: `apps/web/features/map/shape-geojson.test.ts:1-35`
- **Validate**: `pnpm test`

### Task 4: Create OutOfBoundsWarning component

- **File**: `apps/web/components/map-viewer/out-of-bounds-warning.tsx`
- **Action**: CREATE
- **Implement**:
  ```tsx
  'use client'

  import { useMemo } from 'react'
  import { useConfiguratorStore } from '@/lib/store/configurator'
  import { generateShapeGeoJSON } from '@/features/map/shape-geojson'
  import { isRouteOutOfBounds } from '@/features/map/out-of-bounds'

  export function OutOfBoundsWarning() {
    const routeCoordinates = useConfiguratorStore((s) => s.routeCoordinates)
    const routeBounds = useConfiguratorStore((s) => s.routeBounds)
    const shape = useConfiguratorStore((s) => s.shape)

    const outOfBounds = useMemo(() => {
      if (!routeCoordinates || !routeBounds) return false
      return isRouteOutOfBounds(routeCoordinates, generateShapeGeoJSON(routeBounds, shape))
    }, [routeCoordinates, routeBounds, shape])

    if (!outOfBounds) return null

    return (
      <p
        role="alert"
        className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
      >
        Teile deiner Route liegen außerhalb der gewählten Ausschnittform und werden auf dem Poster abgeschnitten.
      </p>
    )
  }
  ```
- **Mirror**: `apps/web/components/map-viewer/shape-toggle.tsx:1-8` — `'use client'` + Zustand selectors; `apps/web/components/upload/gpx-dropzone.tsx:135-139` — alert banner markup
- **Validate**: `pnpm run build`

### Task 5: Add OutOfBoundsWarning to map step page

- **File**: `apps/web/app/product-configurator/map/page.tsx`
- **Action**: UPDATE
- **Implement** — add import and render between ShapeToggle and MapViewer:
  ```tsx
  import { MapViewer } from '@/components/map-viewer/map-viewer'
  import { ShapeToggle } from '@/components/map-viewer/shape-toggle'
  import { OutOfBoundsWarning } from '@/components/map-viewer/out-of-bounds-warning'

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
        <div className="mb-4">
          <OutOfBoundsWarning />
        </div>
        <MapViewer />
      </div>
    )
  }
  ```
- **Mirror**: `apps/web/app/product-configurator/map/page.tsx:1-20` — current page structure
- **Validate**: `pnpm run build`

---

## Validation

```bash
# Type check + build
pnpm run build

# Lint
pnpm run lint

# Tests (expect ≥ 5 new out-of-bounds cases; all 41 prior pass)
pnpm test
```

---

## Acceptance Criteria

- [ ] Warning banner visible when any route coord falls outside the shape
- [ ] No warning shown when all coords are inside the shape
- [ ] Switching between Circle and Hexagon re-evaluates the check (React re-renders via `useMemo`)
- [ ] Warning is amber/informational (not red error style)
- [ ] `role="alert"` present for screen-reader accessibility
- [ ] Warning renders above the map and does not obscure controls
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (≥ 5 new cases; all 41 prior pass)
