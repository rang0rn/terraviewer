# Implementation Report

**Plan**: `.agents/plans/completed/tv-011-terrain-mesh.plan.md`
**Branch**: `feature/tv-002-gpx-upload`
**Status**: COMPLETE

## Summary

Implemented the terrain 3D preview using real elevation data from Mapterhorn.com (Terrarium RGB WebP tiles, Copernicus GLO-30 30m DEM). A server-side API route fetches the tiles covering the route's bounding box, decodes pixel RGB values to elevation, and returns a flat elevation grid. The client-side TerrainMesh R3F component displaces a PlaneGeometry with those elevations, masks vertices to the selected shape (circle or flat-top hexagon), renders a route TubeGeometry on top, and adds a solid sockel below the terrain shape. The placeholder cylinder was replaced with the live terrain mesh.

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Add sharp dependency | `package.json` + `.npmrc` | ✅ |
| 2 | Create terrain types | `types/terrain.ts` | ✅ |
| 3 | Create tile-math library | `lib/terrain/tile-math.ts` | ✅ |
| 4 | Create tile-math tests | `lib/terrain/tile-math.test.ts` | ✅ |
| 5 | Create tile-fetch library | `lib/terrain/tile-fetch.ts` | ✅ |
| 6 | Create tile-fetch tests | `lib/terrain/tile-fetch.test.ts` | ✅ |
| 7 | Create terrain API route | `app/api/terrain/data/route.ts` | ✅ |
| 8 | Create terrain API tests | `app/api/terrain/data/route.test.ts` | ✅ |
| 9 | Create TerrainMesh component | `components/terrain-viewer/terrain-mesh.tsx` | ✅ |
| 10 | Update TerrainViewer | `components/terrain-viewer/terrain-viewer.tsx` | ✅ |

## Validation Results

| Check | Result |
|-------|--------|
| Type check / build | ✅ |
| Lint | ✅ (0 warnings) |
| Tests | ✅ (71 passed, +23 new) |
| E2E — API returns real elevation data | ✅ (~498–500m for Munich area) |
| E2E — API returns 400 for missing params | ✅ |

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `apps/web/package.json` | UPDATE | +sharp ^0.34.5 |
| `.npmrc` | CREATE | allow-build[] for sharp |
| `package.json` (root) | UPDATE | pnpm.onlyBuiltDependencies |
| `apps/web/types/terrain.ts` | CREATE | TerrainQuality, TerrainData, TerrainApiResponse |
| `apps/web/lib/terrain/tile-math.ts` | CREATE | lngLatToTileXY, tileBounds, terrariumDecode, zoom/resolution helpers |
| `apps/web/lib/terrain/tile-math.test.ts` | CREATE | 14 tests |
| `apps/web/lib/terrain/tile-fetch.ts` | CREATE | WebP tile fetch + sharp decode + grid assembly |
| `apps/web/lib/terrain/tile-fetch.test.ts` | CREATE | 4 tests (mocked sharp + fetch) |
| `apps/web/app/api/terrain/data/route.ts` | CREATE | GET /api/terrain/data handler |
| `apps/web/app/api/terrain/data/route.test.ts` | CREATE | 6 tests |
| `apps/web/components/terrain-viewer/terrain-mesh.tsx` | CREATE | R3F TerrainMesh with vertex displacement, shape mask, route tube, sockel |
| `apps/web/components/terrain-viewer/terrain-viewer.tsx` | UPDATE | Replace placeholder cylinder; fetch terrain; render TerrainMesh |

## Deviations from Plan

1. **Munich tile test coordinates corrected**: Plan had x=1094, y=713 — computed values are x=1089, y=710. Fixed in tile-math.test.ts.
2. **sharp install required `.npmrc` + root `package.json` changes**: pnpm 11 requires `pnpm.onlyBuiltDependencies` in root package.json AND `allow-build[]=sharp` in `.npmrc`. Added both.
3. **`useMemo` deps cleaned up**: Removed redundant `elevationScale` and `shape` from routeTubeGeometry's deps (ESLint exhaustive-deps warning resolved by keeping `scaleFactor` and `inShape` which already capture those values).

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `lib/terrain/tile-math.test.ts` | lngLatToTileXY (4), tileBounds (2), terrariumDecode (4), zoom/resolution (3) = 13 tests |
| `lib/terrain/tile-fetch.test.ts` | grid shape, sea level, 500m elevation, HTTP error = 4 tests |
| `app/api/terrain/data/route.test.ts` | valid request, missing params, non-numeric bound, tile error, quality fallback, desktop quality = 6 tests |
