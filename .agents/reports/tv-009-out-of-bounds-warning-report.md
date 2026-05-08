# Implementation Report

**Plan**: `.agents/plans/tv-009-out-of-bounds-warning.plan.md`
**Branch**: `feature/tv-002-gpx-upload`
**Status**: COMPLETE

## Summary

Implemented the out-of-bounds warning for the 2D Map step. `isRouteOutOfBounds()` uses `@turf/boolean-point-in-polygon` to test each route coordinate against the shape polygon via `Array.some` (short-circuits at first violation). `OutOfBoundsWarning` is a `useMemo`-driven client component that re-evaluates automatically when `shape` or `routeCoordinates` changes — the amber banner appears above the map when any route point falls outside the current bounding shape.

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Install @turf/boolean-point-in-polygon | `apps/web/package.json` | ✅ |
| 2 | Create out-of-bounds utility | `apps/web/features/map/out-of-bounds.ts` | ✅ |
| 3 | Unit tests for out-of-bounds utility | `apps/web/features/map/out-of-bounds.test.ts` | ✅ |
| 4 | Create OutOfBoundsWarning component | `apps/web/components/map-viewer/out-of-bounds-warning.tsx` | ✅ |
| 5 | Update map page to render warning | `apps/web/app/product-configurator/map/page.tsx` | ✅ |

## Validation Results

| Check | Result |
|-------|--------|
| Type check (`pnpm run build`) | ✅ |
| Lint (`pnpm run lint`) | ✅ |
| Tests (`pnpm test`) | ✅ (46 passed, 10 test files) |

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `apps/web/package.json` + `pnpm-lock.yaml` | UPDATE | `@turf/boolean-point-in-polygon 7.3.5` + `@types/geojson 7946.0.16` added |
| `apps/web/features/map/out-of-bounds.ts` | CREATE | `isRouteOutOfBounds()` — `booleanPointInPolygon` + `Array.some` |
| `apps/web/features/map/out-of-bounds.test.ts` | CREATE | 5 unit tests |
| `apps/web/components/map-viewer/out-of-bounds-warning.tsx` | CREATE | Amber banner, `useMemo`-derived, renders null when route is in-bounds |
| `apps/web/app/product-configurator/map/page.tsx` | UPDATE | `<OutOfBoundsWarning />` added between ShapeToggle and MapViewer |

## Deviations from Plan

**`@types/geojson` added as dev dependency** — the plan used `import type { Feature, Polygon } from 'geojson'` but the `geojson` types package was not installed. `@types/geojson` was added as a devDependency; `@turf/helpers` (the alternative) was not directly importable as a transitive dep. No functional change.

**Zoom re-evaluation not implemented** — documented in the plan as intentional. The shape polygon is geographically fixed; React's `useMemo` re-runs when `shape` changes, which is the meaningful interactive trigger.

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `apps/web/features/map/out-of-bounds.test.ts` | All coords inside → false; any coord outside → true; empty coords → false; single outside coord → true; hexagon: centroid inside → false |
