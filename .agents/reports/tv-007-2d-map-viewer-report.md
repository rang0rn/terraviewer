# Implementation Report

**Plan**: `.agents/plans/tv-007-2d-map-viewer.plan.md`
**Branch**: `feature/tv-002-gpx-upload`
**Status**: COMPLETE

## Summary

Implemented the 2D Map step using MapLibre GL JS with OpenStreetMap tiles. The route polyline is drawn from coordinates extracted client-side at upload time (via the existing `parseGpx()` function), stored in Zustand as `routeCoordinates`, and read by the map component on mount. No additional API calls are needed to render the route.

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Install maplibre-gl | `apps/web/package.json` | ✅ |
| 2 | Export TrackPoint type | `apps/web/lib/gpx/parser.ts` | ✅ |
| 3 | Create route-geojson utility | `apps/web/features/map/route-geojson.ts` | ✅ |
| 4 | Unit tests for route-geojson | `apps/web/features/map/route-geojson.test.ts` | ✅ |
| 5 | Add routeCoordinates to ConfiguratorState type | `apps/web/types/configurator.ts` | ✅ |
| 6 | Add routeCoordinates to Zustand default state | `apps/web/lib/store/configurator.ts` | ✅ |
| 7 | Parse coordinates client-side in dropzone | `apps/web/components/upload/gpx-dropzone.tsx` | ✅ |
| 8 | Create MapViewer component | `apps/web/components/map-viewer/map-viewer.tsx` | ✅ |
| 9 | Replace map page stub | `apps/web/app/product-configurator/map/page.tsx` | ✅ |
| 10 | Document NEXT_PUBLIC_MAP_TILE_URL | `.env.local.example` | ✅ |

## Validation Results

| Check | Result |
|-------|--------|
| Type check (`pnpm run build`) | ✅ |
| Lint (`pnpm run lint`) | ✅ |
| Tests (`pnpm test`) | ✅ (36 passed, 8 test files) |

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `apps/web/lib/gpx/parser.ts` | UPDATE | `type TrackPoint` → `export type TrackPoint` |
| `apps/web/features/map/route-geojson.ts` | CREATE | `trackPointsToLngLat()` coordinate conversion |
| `apps/web/features/map/route-geojson.test.ts` | CREATE | 4 unit tests |
| `apps/web/types/configurator.ts` | UPDATE | Added `routeCoordinates: [number, number][] \| null` |
| `apps/web/lib/store/configurator.ts` | UPDATE | Added `routeCoordinates: null` to default state |
| `apps/web/components/upload/gpx-dropzone.tsx` | UPDATE | Client-side GPX parsing after upload success |
| `apps/web/components/map-viewer/map-viewer.tsx` | CREATE | Full MapLibre GL JS component |
| `apps/web/app/product-configurator/map/page.tsx` | UPDATE | Replaced stub with `<MapViewer />` |
| `.env.local.example` | UPDATE | `MAX_UPLOAD_SIZE_BYTES` and `NEXT_PUBLIC_MAP_TILE_URL` documented |
| `apps/web/package.json` + `pnpm-lock.yaml` | UPDATE | `maplibre-gl` added as dependency |

## Deviations from Plan

None. Implementation matched the plan exactly. The `useEffect(callback, [])` empty-deps approach was accepted as written — safe because the MapViewer component unmounts and remounts between configurator steps, so no stale closure issue arises.

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `apps/web/features/map/route-geojson.test.ts` | empty array → `[]`; correct `[lng, lat]` order (not `[lat, lng]`); preserves all points; handles `null` elevation |
