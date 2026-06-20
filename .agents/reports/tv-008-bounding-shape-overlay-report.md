# Implementation Report

**Plan**: `.agents/plans/tv-008-bounding-shape-overlay.plan.md`
**Branch**: `feature/tv-002-gpx-upload`
**Status**: COMPLETE

## Summary

Implemented the bounding shape overlay for the 2D Map step. A `generateShapeGeoJSON()` utility uses `@turf/circle` with `steps: 64` (circle) or `steps: 6` (hexagon) to produce a GeoJSON Polygon centered on the route bounds midpoint. MapLibre renders it as a semi-transparent fill + stroke layer pair. A second `useEffect` in `MapViewer` calls `source.setData()` when the shape changes, swapping the overlay without reinitialising the map. A new `ShapeToggle` client component provides the Kreis / Hexagon buttons above the map.

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Install @turf/circle | `apps/web/package.json` | ✅ |
| 2 | Create shape-geojson utility | `apps/web/features/map/shape-geojson.ts` | ✅ |
| 3 | Unit tests for shape-geojson | `apps/web/features/map/shape-geojson.test.ts` | ✅ |
| 4 | Add shape overlay layers + update effect | `apps/web/components/map-viewer/map-viewer.tsx` | ✅ |
| 5 | Create ShapeToggle component | `apps/web/components/map-viewer/shape-toggle.tsx` | ✅ |
| 6 | Update map page with ShapeToggle | `apps/web/app/product-configurator/map/page.tsx` | ✅ |

## Validation Results

| Check | Result |
|-------|--------|
| Type check (`pnpm run build`) | ✅ |
| Lint (`pnpm run lint`) | ✅ |
| Tests (`pnpm test`) | ✅ (41 passed, 9 test files) |

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `apps/web/package.json` + `pnpm-lock.yaml` | UPDATE | `@turf/circle 7.3.5` added |
| `apps/web/features/map/shape-geojson.ts` | CREATE | `generateShapeGeoJSON()` — flat-earth radius + turf circle |
| `apps/web/features/map/shape-geojson.test.ts` | CREATE | 5 unit tests |
| `apps/web/components/map-viewer/map-viewer.tsx` | UPDATE | `mapLoadedRef`, `shape` selector, shape source/layers, shape-update effect |
| `apps/web/components/map-viewer/shape-toggle.tsx` | CREATE | Circle/Hexagon toggle buttons |
| `apps/web/app/product-configurator/map/page.tsx` | UPDATE | `<ShapeToggle />` rendered above `<MapViewer />` |

## Deviations from Plan

None. Implementation matched the plan exactly. The shape source/layer block is guarded with `if (routeBounds)` as specified, and `mapLoadedRef.current = true` is set after all source/layer registrations.

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `apps/web/features/map/shape-geojson.test.ts` | Returns GeoJSON Feature with Polygon geometry; circle has 65 coords (64 steps + closing); hexagon has 7 coords (6 steps + closing); center near bounds midpoint; no throw for zero-extent bounds |
