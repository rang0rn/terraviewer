# Plan: TV-007 2D Map Viewer with Route Display

## Summary

Build the 2D Map step: a MapLibre GL JS map rendering the uploaded route as a colored polyline over OpenStreetMap tiles, auto-fitted to the route bounds. The key architectural decision is **client-side coordinate extraction at upload time**: after the server confirms the upload, the dropzone reads the file content, calls the existing `parseGpx()` function (which works in browsers via `fast-xml-parser`), and stores `routeCoordinates` (`[lng, lat][]`) in Zustand. The map component reads those coordinates directly from the store — no second fetch, no CORS concerns. MapLibre map initialization happens inside `useEffect` so it is fully client-side.

## User Story

As a customer
I want to see my uploaded route drawn on an OpenStreetMap-based 2D map with zoom support
So that I can verify my correct track is being used before proceeding to the 3D preview

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | MEDIUM |
| Systems Affected | `components/map-viewer`, `features/map`, `types/configurator`, `lib/store`, `lib/gpx/parser`, `components/upload`, `app/product-configurator/map` |
| Jira Issue | TV-007 |

---

## Patterns to Follow

### Client component with useRef for DOM mount
```tsx
// SOURCE: apps/web/components/upload/gpx-dropzone.tsx:1-16
'use client'
import { useRef, useState } from 'react'
import { useConfiguratorStore } from '@/lib/store/configurator'
// → same pattern: 'use client', useRef for the map container, useConfiguratorStore selector
```

### Zustand selector reads
```ts
// SOURCE: apps/web/components/ui/stepper.tsx:17
const currentStep = useConfiguratorStore((s) => s.currentStep)
// → use granular selectors: const routeCoordinates = useConfiguratorStore(s => s.routeCoordinates)
```

### updateConfig pattern
```ts
// SOURCE: apps/web/components/upload/gpx-dropzone.tsx:42-43
updateConfig('gpxUrl', data.gpxUrl)
updateConfig('routeBounds', data.routeBounds)
// → updateConfig('routeCoordinates', coordinates)
```

### ConfiguratorState type extension
```ts
// SOURCE: apps/web/types/configurator.ts:25-35
export type ConfiguratorState = {
  gpxUrl: string | null
  routeBounds: RouteBounds | null
  // → add: routeCoordinates: [number, number][] | null
```

### Vitest unit test
```ts
// SOURCE: apps/web/features/gpx/validate-client.test.ts:1-7
import { describe, it, expect } from 'vitest'
import { validateGpxFile } from './validate-client'
function makeFile(name: string, size = 100): File { ... }
```

### Tailwind responsive height for map container
```tsx
// SOURCE: apps/web/components/upload/gpx-dropzone.tsx:86
className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 ..."
// → use: className="h-[480px] w-full rounded-xl overflow-hidden"
```

---

## Route Color Map

The `routeColor` from Zustand is already stored as a semantic name. Map it to hex for MapLibre paint:

```ts
const ROUTE_COLOR_HEX: Record<RouteColor, string> = {
  orange: '#f97316',
  green:  '#22c55e',
  blue:   '#3b82f6',
  red:    '#ef4444',
  white:  '#ffffff',
  yellow: '#eab308',
  black:  '#18181b',
}
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/lib/gpx/parser.ts` | UPDATE | Export `TrackPoint` type so `features/map/` can reference it |
| `apps/web/features/map/route-geojson.ts` | CREATE | `trackPointsToLngLat()` — converts `TrackPoint[]` to `[lng, lat][]` |
| `apps/web/features/map/route-geojson.test.ts` | CREATE | Unit tests for the coordinate conversion |
| `apps/web/types/configurator.ts` | UPDATE | Add `routeCoordinates: [number, number][] | null` |
| `apps/web/lib/store/configurator.ts` | UPDATE | Add `routeCoordinates: null` to default state |
| `apps/web/components/upload/gpx-dropzone.tsx` | UPDATE | After API success: parse GPX client-side, store `routeCoordinates` |
| `apps/web/components/map-viewer/map-viewer.tsx` | CREATE | MapLibre GL JS map component |
| `apps/web/app/product-configurator/map/page.tsx` | UPDATE | Replace stub with `<MapViewer />` |
| `.env.local.example` | UPDATE | Document `NEXT_PUBLIC_MAP_TILE_URL` |

---

## Risks

| Risk | Mitigation |
|------|------------|
| MapLibre accesses `window` during SSR | Initialize only inside `useEffect`; component is `'use client'` |
| `fast-xml-parser` bundled client-side | Acceptable for MVP; it's already a production dependency |
| Map container needs explicit height | Use fixed Tailwind height class on wrapper div |
| Stale coordinates if user re-uploads | `updateConfig('routeCoordinates', ...)` overwrites; component unmounts/mounts between steps |
| MapLibre CSS not bundled | Import `'maplibre-gl/dist/maplibre-gl.css'` inside the component file |

---

## Tasks

### Task 1: Install maplibre-gl

- **Action**: Run `pnpm add maplibre-gl` in `apps/web/`
- **Validate**: `pnpm run build` — confirm no peer dep errors

### Task 2: Export TrackPoint from parser.ts

- **File**: `apps/web/lib/gpx/parser.ts`
- **Action**: UPDATE line 4
- **Implement**: Change `type TrackPoint` → `export type TrackPoint`
- **Validate**: `pnpm run build`

### Task 3: Create route-geojson utility

- **File**: `apps/web/features/map/route-geojson.ts`
- **Action**: CREATE
- **Implement**:
  ```ts
  import type { TrackPoint } from '@/lib/gpx/parser'

  export function trackPointsToLngLat(points: TrackPoint[]): [number, number][] {
    return points.map((p) => [p.lng, p.lat])
  }
  ```
  Note: MapLibre GeoJSON uses `[longitude, latitude]` order (reversed from GPX `lat/lon`).
- **Mirror**: `apps/web/features/gpx/validate-client.ts:1-11`
- **Validate**: `pnpm run build`

### Task 4: Unit tests for route-geojson

- **File**: `apps/web/features/map/route-geojson.test.ts`
- **Action**: CREATE
- **Implement**:
  - `it('returns empty array for no points')`
  - `it('maps lat/lng to [lng, lat] GeoJSON order')` — assert first element is `[lng, lat]` not `[lat, lng]`
  - `it('preserves all points')`
- **Mirror**: `apps/web/features/gpx/validate-client.test.ts:1-25`
- **Validate**: `pnpm test`

### Task 5: Add routeCoordinates to ConfiguratorState type

- **File**: `apps/web/types/configurator.ts`
- **Action**: UPDATE
- **Implement**: Add one field after `routeBounds`:
  ```ts
  routeCoordinates: [number, number][] | null
  ```
- **Mirror**: `apps/web/types/configurator.ts:8-13` — same nullable pattern as `routeBounds`
- **Validate**: `pnpm run build`

### Task 6: Add routeCoordinates to Zustand store default state

- **File**: `apps/web/lib/store/configurator.ts`
- **Action**: UPDATE
- **Implement**: Add to `DEFAULT_STATE`:
  ```ts
  routeCoordinates: null,
  ```
- **Mirror**: `apps/web/lib/store/configurator.ts:8-18`
- **Validate**: `pnpm run build`

### Task 7: Parse coordinates client-side in gpx-dropzone

- **File**: `apps/web/components/upload/gpx-dropzone.tsx`
- **Action**: UPDATE
- **Implement**:
  1. Add imports at the top:
     ```ts
     import { parseGpx } from '@/lib/gpx/parser'
     import { trackPointsToLngLat } from '@/features/map/route-geojson'
     ```
  2. After `if (!data.success) { ... return }` and before `updateConfig('gpxUrl', ...)`, add:
     ```ts
     try {
       const gpxText = await file.text()
       const { trackPoints } = parseGpx(gpxText)
       updateConfig('routeCoordinates', trackPointsToLngLat(trackPoints))
     } catch {
       // non-fatal: map step will render without a route line
     }
     ```
- **Mirror**: `apps/web/components/upload/gpx-dropzone.tsx:32-49` — same try/catch + updateConfig pattern
- **Validate**: `pnpm run build`

### Task 8: Create MapViewer component

- **File**: `apps/web/components/map-viewer/map-viewer.tsx`
- **Action**: CREATE
- **Implement** a `'use client'` component:
  ```tsx
  'use client'

  import { useEffect, useRef } from 'react'
  import maplibregl from 'maplibre-gl'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import { useConfiguratorStore } from '@/lib/store/configurator'
  import type { RouteColor } from '@/types/configurator'

  const ROUTE_COLOR_HEX: Record<RouteColor, string> = {
    orange: '#f97316', green: '#22c55e', blue: '#3b82f6',
    red: '#ef4444', white: '#ffffff', yellow: '#eab308', black: '#18181b',
  }

  const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL
    ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

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
            osm: { type: 'raster', tiles: [TILE_URL], tileSize: 256,
                   attribution: '© OpenStreetMap contributors' },
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
          id: 'route', type: 'line', source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ROUTE_COLOR_HEX[routeColor], 'line-width': 3 },
        })

        if (routeBounds) {
          map.fitBounds(
            [[routeBounds.minLng, routeBounds.minLat],
             [routeBounds.maxLng, routeBounds.maxLat]],
            { padding: 48, animate: false },
          )
        }
      })

      return () => { map.remove(); mapRef.current = null }
    }, []) // initialized once on mount — route data comes from closure over store values

    if (!routeCoordinates) {
      return (
        <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
          Keine Routendaten vorhanden.
        </div>
      )
    }

    return <div ref={containerRef} className="h-[480px] w-full rounded-xl overflow-hidden" />
  }
  ```
- **Mirror**: `apps/web/components/upload/gpx-dropzone.tsx:1-16` — `'use client'`, imports, store selectors
- **Validate**: `pnpm run build`

### Task 9: Replace map page stub

- **File**: `apps/web/app/product-configurator/map/page.tsx`
- **Action**: UPDATE
- **Implement**:
  ```tsx
  import { MapViewer } from '@/components/map-viewer/map-viewer'

  export default function MapStep() {
    return (
      <div className="py-6">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-ink">Route prüfen</h2>
          <p className="mt-1 text-sm text-ink/60">
            Prüfe deine Route und wähle die gewünschte Ausschnittform.
          </p>
        </div>
        <MapViewer />
      </div>
    )
  }
  ```
- **Mirror**: `apps/web/app/product-configurator/upload/page.tsx:1-15`
- **Validate**: `pnpm run build`

### Task 10: Document NEXT_PUBLIC_MAP_TILE_URL

- **File**: `.env.local.example`
- **Action**: UPDATE — append after `MAX_UPLOAD_SIZE_BYTES=`
- **Implement**:
  ```bash
  # OpenStreetMap-compatible raster tile URL (maplibre-gl format)
  # e.g. https://tile.openstreetmap.org/{z}/{x}/{y}.png
  NEXT_PUBLIC_MAP_TILE_URL=
  ```
- **Mirror**: `.env.local.example:7-8` — comment-then-blank-value pattern
- **Validate**: visual check

---

## Validation

```bash
cd apps/web

# Install first
pnpm add maplibre-gl

# After all tasks:
pnpm run build
pnpm run lint
pnpm test
```

---

## Acceptance Criteria

- [ ] MapLibre GL JS renders with OSM tiles on the 2D Map step
- [ ] Route polyline is visible in the `routeColor` colour (default orange)
- [ ] Map auto-fits to `routeBounds` with 48 px padding on load
- [ ] Map rotation is disabled (`dragRotate: false`, `pitchWithRotate: false`)
- [ ] Empty state shown when `routeCoordinates` is null
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (≥ 3 new route-geojson cases, all 32 prior pass)
- [ ] Responsive and usable at 375 px viewport width
