# Plan: TV-005 File Upload Security

## Summary

All five TV-005 acceptance criteria are implemented (content-type guard, file-size 413, MIME check, rate-limit 429, UUID-keyed storage). The single remaining gap is a technical requirement from the story notes: the file-size cap must be operator-configurable via an environment variable rather than hardcoded. This plan extracts `MAX_FILE_SIZE` from `process.env.MAX_UPLOAD_SIZE_BYTES`, makes the 413 error message reflect the actual configured limit, and documents the new variable in `.env.local.example`. No new test files are needed — the existing `route.test.ts` scenarios continue to exercise the 413 path.

## User Story

As a shop owner
I want the upload endpoint hardened against abuse
So that malicious files or excessive usage cannot compromise the system

## Metadata

| Field | Value |
|-------|-------|
| Type | Technical / ENHANCEMENT |
| Complexity | LOW |
| Systems Affected | `app/api/gpx/upload/route.ts`, `.env.local.example` |
| Jira Issue | TV-005 |

---

## Current State (already implemented)

| Criterion | Location | Status |
|-----------|----------|--------|
| Wrong `Content-Type` → 400 | `route.ts:19-25` | ✅ |
| File too large → 413 | `route.ts:45-50` | ✅ (hardcoded 10 MB) |
| Bad MIME type → 400 | `route.ts:52-64` | ✅ |
| Rate limit exceeded → 429 | `route.ts:12-17` | ✅ |
| UUID key, no PII | `route.ts:99` | ✅ |

**Gap**: `MAX_FILE_SIZE` at `route.ts:7` is a magic number; the story notes require it to come from `MAX_UPLOAD_SIZE_BYTES` env var.

---

## Patterns to Follow

### Module-level constant from env var with fallback
```ts
// SOURCE: apps/web/lib/upload/rate-limit.ts:1-2
const MAX_REQUESTS = 10
const WINDOW_MS = 60_000
// → replace hardcoded values with env-var + fallback pattern:
// const FOO = parseInt(process.env.FOO ?? '', 10) || DEFAULT
```

### Env var documentation in .env.local.example
```bash
# SOURCE: .env.local.example:7-10
# Cloudflare R2 — Account ID (found in R2 dashboard)
GPX_STORAGE_ACCOUNT_ID=
# R2 public bucket domain (e.g. pub-xyz.r2.dev or custom domain)
GPX_STORAGE_PUBLIC_DOMAIN=
```

### German error message with dynamic value
```ts
// SOURCE: apps/web/app/api/gpx/upload/route.ts:47
message: 'Datei zu groß. Maximal 10 MB erlaubt.'
// → message: `Datei zu groß. Maximal ${MAX_FILE_SIZE_MB} MB erlaubt.`
```

### Existing test that covers FILE_TOO_LARGE (no change needed)
```ts
// SOURCE: apps/web/app/api/gpx/upload/route.test.ts (FILE_TOO_LARGE test)
it('returns FILE_TOO_LARGE for a file exceeding 10 MB', async () => {
  const file = makeGpxFile('x', 'big.gpx', 11 * 1024 * 1024)
  const res = await POST(makeRequest({ file }))
  expect(res.status).toBe(413)
  if (!body.success) expect(body.errorCode).toBe('FILE_TOO_LARGE')
})
// Tests check status + errorCode only — message is not asserted, so the
// dynamic message template requires no test change.
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/app/api/gpx/upload/route.ts` | UPDATE | Read `MAX_FILE_SIZE` from env var; derive `MAX_FILE_SIZE_MB` for the error message |
| `.env.local.example` | UPDATE | Document `MAX_UPLOAD_SIZE_BYTES` with a comment |

---

## Tasks

### Task 1: Make MAX_FILE_SIZE configurable via env var

- **File**: `apps/web/app/api/gpx/upload/route.ts`
- **Action**: UPDATE lines 7–8
- **Implement**:
  Replace:
  ```ts
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  ```
  With:
  ```ts
  const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES ?? '', 10) || 10 * 1024 * 1024
  const MAX_FILE_SIZE_MB = Math.round(MAX_FILE_SIZE / (1024 * 1024))
  ```
  Then update the 413 error message on line 47:
  ```ts
  message: `Datei zu groß. Maximal ${MAX_FILE_SIZE_MB} MB erlaubt.`
  ```
- **Mirror**: `apps/web/lib/upload/rate-limit.ts:1-2` — same style of named constants at module top
- **Validate**: `pnpm run build` (from `apps/web/`)

### Task 2: Document MAX_UPLOAD_SIZE_BYTES in .env.local.example

- **File**: `.env.local.example`
- **Action**: UPDATE — append to the bottom of the file
- **Implement**:
  ```bash
  # Max GPX upload size in bytes (default: 10485760 = 10 MB)
  MAX_UPLOAD_SIZE_BYTES=
  ```
- **Mirror**: `.env.local.example:7-10` — same comment-then-blank-value pattern used for ACCOUNT_ID and PUBLIC_DOMAIN
- **Validate**: visual inspection — file should be valid shell syntax

---

## Validation

```bash
cd apps/web

# Type check
pnpm run build

# Lint
pnpm run lint

# Tests — existing FILE_TOO_LARGE test must still pass
pnpm test
```

---

## Acceptance Criteria

- [ ] `MAX_FILE_SIZE` in `route.ts` reads from `process.env.MAX_UPLOAD_SIZE_BYTES`, falling back to `10 * 1024 * 1024`
- [ ] The 413 error message reflects the actual configured limit in MB
- [ ] `MAX_UPLOAD_SIZE_BYTES` is documented in `.env.local.example`
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (all 32 existing tests pass, no regressions)
