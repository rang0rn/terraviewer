# Plan: TV-003 GPX Parsing & Elevation Validation

## Summary

Server-side GPX parsing, `routeBounds` computation, and elevation validation for `POST /api/gpx/upload`. The core logic (`parseGpx`, route handler, rate limiter, client validator) is fully implemented in the previous commit. This plan documents what exists, identifies the remaining gap — API route and rate-limiter test files — and provides tasks to close it.

## User Story

As a developer
I want server-side GPX parsing and elevation validation in the upload API
So that only valid, elevation-containing GPX files progress through the configurator

## Metadata

| Field | Value |
|-------|-------|
| Type | Technical |
| Complexity | Small |
| Systems Affected | `api/gpx/upload`, `lib/gpx`, `lib/upload`, `features/gpx`, `types/upload` |
| Jira Issue | TV-003 |

---

## Current State (already implemented)

All five acceptance criteria are met by the previous commit:

| File | What it does |
|------|-------------|
| `apps/web/lib/gpx/parser.ts` | Parses XML with `fast-xml-parser`; throws `INVALID_GPX_FORMAT`; computes `routeBounds`; returns `hasElevation` |
| `apps/web/lib/gpx/parser.test.ts` | Covers: valid bounds, elevation detection, missing ele, invalid XML, missing `<trk>` |
| `apps/web/app/api/gpx/upload/route.ts` | Rate-limit → content-type → file size → extension → MIME → parse → elevation gate → storage |
| `apps/web/features/gpx/validate-client.ts` | Client-side extension + size guard before network call |
| `apps/web/features/gpx/validate-client.test.ts` | Covers: valid, wrong extension, case-insensitive, oversized |
| `apps/web/types/upload.ts` | `UploadResponse` discriminated union with all error codes |
| `apps/web/lib/upload/rate-limit.ts` | In-process sliding window; 10 req/min per IP |

**Gap**: the route handler (`route.ts`) and the rate-limiter (`rate-limit.ts`) have no test files.

---

## Patterns to Follow

### Test file structure
```ts
// SOURCE: apps/web/lib/gpx/parser.test.ts:1-5
import { describe, it, expect } from 'vitest'
import { parseGpx } from './parser'
```

### Discriminated union check in tests
```ts
// SOURCE: apps/web/lib/gpx/parser.test.ts:42-44
it('throws INVALID_GPX_FORMAT for malformed XML', () => {
  expect(() => parseGpx(INVALID_XML)).toThrow('INVALID_GPX_FORMAT')
})
```

### UploadResponse type shape
```ts
// SOURCE: apps/web/types/upload.ts:11-25
export type UploadSuccessResponse = {
  success: true; gpxUrl: string; fileName: string
  hasElevation: boolean; routeBounds: RouteBounds
}
export type UploadErrorResponse = {
  success: false; errorCode: UploadErrorCode; message: string
}
```

### Rate-limiter API (for mocking)
```ts
// SOURCE: apps/web/lib/upload/rate-limit.ts:7-8
export function checkRateLimit(ip: string): boolean
```

### NextRequest construction in tests (Next.js App Router)
```ts
import { NextRequest } from 'next/server'
// Build a multipart request:
const formData = new FormData()
formData.append('file', new File([content], 'test.gpx', { type: 'application/gpx+xml' }))
const req = new NextRequest('http://localhost/api/gpx/upload', {
  method: 'POST',
  body: formData,
})
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/app/api/gpx/upload/route.test.ts` | CREATE | Integration tests for the upload route handler |
| `apps/web/lib/upload/rate-limit.test.ts` | CREATE | Unit tests for the in-process rate limiter |

---

## Tasks

### Task 1: Rate-limiter unit tests

- **File**: `apps/web/lib/upload/rate-limit.test.ts`
- **Action**: CREATE
- **Implement**:
  - Import `checkRateLimit` from `./rate-limit`
  - Test: first call for a new IP returns `true`
  - Test: 10th consecutive call returns `true`, 11th returns `false`
  - Test: after the window expires (mock `Date.now` via `vi.useFakeTimers()`), counter resets and returns `true` again
  - Test: separate IPs do not share counters
- **Mirror**: `apps/web/lib/gpx/parser.test.ts:1-5` — same import/describe pattern
- **Validate**: `pnpm test` (from `apps/web/`)

### Task 2: Upload route integration tests

- **File**: `apps/web/app/api/gpx/upload/route.test.ts`
- **Action**: CREATE
- **Implement** (use `vi.mock` for `@/lib/upload/rate-limit` and `@/lib/storage/get-storage`):

  ```
  beforeEach: mock checkRateLimit → true, mock storage.upload → returns fake URL
  ```

  Scenarios to cover:
  1. **Happy path** — valid GPX with `<ele>` tags → 200, `success: true`, `hasElevation: true`, `routeBounds` present, `gpxUrl` matches mock
  2. **No elevation** — valid GPX, all `<ele>` absent → 422, `errorCode: 'NO_ELEVATION_DATA'`
  3. **Malformed XML** — garbled text → 422, `errorCode: 'INVALID_GPX_FORMAT'`
  4. **Wrong content-type** — send `application/json` header → 400, `errorCode: 'INVALID_MIME_TYPE'`
  5. **File too large** — `file.size > 10 MB` → 413, `errorCode: 'FILE_TOO_LARGE'`
  6. **Wrong extension** — file named `route.kml` → 400, `errorCode: 'INVALID_MIME_TYPE'`
  7. **Rate limited** — mock `checkRateLimit` → false → 429, `errorCode: 'RATE_LIMIT_EXCEEDED'`
  8. **Storage failure** — mock `storage.upload` throws → 500, `errorCode: 'STORAGE_ERROR'`

- **Note**: Vitest runs in `jsdom` environment. `NextRequest`/`NextResponse` are available from `next/server`. `FormData` / `File` are available globally via jsdom. For the file-size check, construct a `File` with the correct `.size` via `Object.defineProperty` since jsdom `File` constructor doesn't honour content length accurately at large sizes.
- **Mirror**: `apps/web/lib/gpx/parser.test.ts` — `describe/it/expect` structure; `apps/web/features/gpx/validate-client.test.ts:4-7` — `makeFile` helper pattern
- **Validate**: `pnpm test` (from `apps/web/`)

---

## Validation

```bash
cd apps/web
pnpm test          # all tests pass
pnpm run build     # type-check passes
pnpm run lint      # no lint errors
```

---

## Acceptance Criteria

- [ ] `rate-limit.test.ts` covers: allow / block / reset / IP isolation
- [ ] `route.test.ts` covers: all 8 scenarios above
- [ ] `pnpm test` exits 0 with no failing tests
- [ ] `pnpm run build` exits 0 (TypeScript strict)
- [ ] No mocks leak between test files (use `vi.resetAllMocks()` in `afterEach`)
