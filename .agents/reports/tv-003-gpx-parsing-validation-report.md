# Implementation Report

**Plan**: `.agents/plans/tv-003-gpx-parsing-validation.plan.md`
**Branch**: `feature/tv-002-gpx-upload`
**Status**: COMPLETE

## Summary

TV-003 (GPX Parsing & Elevation Validation) core logic was already implemented in the previous commit. This implementation pass closed the remaining gap by adding unit tests for the in-process rate limiter and integration tests for the upload route handler, covering all 8 scenarios from the plan.

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Rate-limiter unit tests | `apps/web/lib/upload/rate-limit.test.ts` | ✅ |
| 2 | Upload route integration tests | `apps/web/app/api/gpx/upload/route.test.ts` | ✅ |

## Validation Results

| Check | Result |
|-------|--------|
| Type check (`pnpm run build`) | ✅ |
| Lint (`pnpm run lint`) | ✅ |
| Tests (`pnpm test`) | ✅ 22 passed |

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `apps/web/lib/upload/rate-limit.test.ts` | CREATE | +38 |
| `apps/web/app/api/gpx/upload/route.test.ts` | CREATE | +148 |

## Deviations from Plan

**`makeGpxFile` helper uses `Object.create(File.prototype)` instead of `new File()`** — jsdom 25's `File` implementation omits `Blob.text()` and `Blob.arrayBuffer()`. Constructing a file-like object via `Object.create(File.prototype)` lets us define those methods explicitly while still passing `instanceof File` checks. The plan mentioned `Object.defineProperty` as a fallback; this approach is cleaner and more reliable.

**Fake `FormData` via plain object** — to pair with the above, `makeRequest` returns a `fakeFormData` plain object (`{ get: ... }`) rather than a real jsdom `FormData`. This avoids jsdom's internal file-wrapping that strips custom properties.

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `lib/upload/rate-limit.test.ts` | allows first request; allows ≤10 in window; blocks 11th; resets after window; IP isolation |
| `app/api/gpx/upload/route.test.ts` | happy path (valid GPX); NO_ELEVATION_DATA; INVALID_GPX_FORMAT; wrong content-type; FILE_TOO_LARGE; wrong extension; RATE_LIMIT_EXCEEDED; STORAGE_ERROR |
