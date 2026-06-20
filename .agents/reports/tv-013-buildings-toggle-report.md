# Implementation Report

**Plan**: `.agents/plans/tv-013-buildings-toggle.plan.md`
**Branch**: `feature/tv-002-gpx-upload`
**Status**: COMPLETE

## Summary

Added an optional buildings layer to the 3D terrain preview. Buildings are fetched from the Overpass API when first enabled and cached locally — toggling off hides the meshes without re-fetching. A `BuildingsToggle` (Ohne Gebäude / Mit Gebäuden) is wired into the preview step alongside the existing `TerrainColorToggle`.

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Extend terrain types with `BuildingFeature` | `apps/web/types/terrain.ts` | ✅ |
| 2 | Create Overpass API buildings fetcher | `apps/web/lib/buildings/fetch-buildings.ts` | ✅ |
| 3 | Unit tests for `fetchBuildings` | `apps/web/lib/buildings/fetch-buildings.test.ts` | ✅ |
| 4 | Extend terrain API to return buildings | `apps/web/app/api/terrain/data/route.ts` | ✅ |
| 5 | Update terrain API route tests | `apps/web/app/api/terrain/data/route.test.ts` | ✅ |
| 6 | Create `BuildingsMesh` component | `apps/web/components/terrain-viewer/buildings-mesh.tsx` | ✅ |
| 7 | Update `TerrainViewer` to fetch and render buildings | `apps/web/components/terrain-viewer/terrain-viewer.tsx` | ✅ |
| 8 | Create `BuildingsToggle` component | `apps/web/components/terrain-viewer/buildings-toggle.tsx` | ✅ |
| 9 | Wire `BuildingsToggle` into the preview step | `apps/web/app/product-configurator/preview/page.tsx` | ✅ |

## Validation Results

| Check | Result |
|-------|--------|
| Type check (`pnpm run build`) | ✅ Compiled successfully |
| Lint (`pnpm run lint`) | ✅ No warnings or errors |
| Tests (`pnpm test`) | ✅ 79 passed across 15 files |

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `apps/web/types/terrain.ts` | UPDATE | Added `BuildingFeature` type; `buildings?: BuildingFeature[]` on `TerrainData` |
| `apps/web/lib/buildings/fetch-buildings.ts` | CREATE | Overpass API client; node-map → way parsing; MAX_BUILDINGS=200 cap |
| `apps/web/lib/buildings/fetch-buildings.test.ts` | CREATE | 6 unit tests covering height tags, defaults, errors, incomplete ways |
| `apps/web/app/api/terrain/data/route.ts` | UPDATE | `?buildings=true` param; calls `fetchBuildings`; Overpass failure → `[]` not 502 |
| `apps/web/app/api/terrain/data/route.test.ts` | UPDATE | 2 new tests: buildings=true response shape, Overpass failure non-fatal |
| `apps/web/components/terrain-viewer/buildings-mesh.tsx` | CREATE | `ExtrudeGeometry` per footprint; centroid in-shape filter; terrain height sampling |
| `apps/web/components/terrain-viewer/terrain-viewer.tsx` | UPDATE | Lazy buildings fetch; cache reset on routeBounds change; "no buildings" message |
| `apps/web/components/terrain-viewer/buildings-toggle.tsx` | CREATE | Ohne Gebäude / Mit Gebäuden toggle; mirrors TerrainColorToggle pattern |
| `apps/web/app/product-configurator/preview/page.tsx` | UPDATE | `<BuildingsToggle />` in `mb-4` div between TerrainColorToggle and TerrainViewer |

## Deviations from Plan

- `BuildingsMesh` centroid computation: retained original `[lng, lat]` values before converting to normalised space (as the plan's "Note" recommended), rather than the first draft in the task body that re-derived lat from normalised cz.

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `apps/web/lib/buildings/fetch-buildings.test.ts` | returns buildings with correct height from building:levels; uses height tag when present; falls back to DEFAULT_HEIGHT; returns empty array when no ways; throws on non-200; skips ways with < 4 resolved nodes |
| `apps/web/app/api/terrain/data/route.test.ts` | includes buildings array when ?buildings=true; returns empty buildings array when Overpass fails |
