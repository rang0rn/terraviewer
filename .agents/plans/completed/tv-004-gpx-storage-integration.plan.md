# Plan: TV-004 GPX Storage Integration

## Summary

GPX files are stored in an S3-compatible object store (Cloudflare R2) under UUID-keyed paths. The storage layer is abstracted behind a `StorageAdapter` interface with two concrete implementations: an S3/R2 adapter (`lib/storage/s3.ts`) and an in-process mock (`lib/storage/mock.ts`). A factory function (`lib/storage/get-storage.ts`) selects the adapter at runtime based on environment variables. All five TV-004 acceptance criteria are implemented. This plan closes the remaining gap: unit tests for each of the three storage module files.

## User Story

As a developer
I want GPX files stored in an external object store (Cloudflare R2 or S3-compatible)
So that files are accessible to the terrain API and linkable from Shopify orders

## Metadata

| Field | Value |
|-------|-------|
| Type | Technical |
| Complexity | Medium |
| Systems Affected | `lib/storage/` |
| Jira Issue | TV-004 |

---

## Current State (already implemented)

| File | What it does |
|------|-------------|
| `apps/web/lib/storage/index.ts` | `StorageAdapter` interface: `upload(key, data, contentType): Promise<string>` |
| `apps/web/lib/storage/s3.ts` | `createS3Adapter()` — `@aws-sdk/client-s3` + R2 endpoint via env vars; returns `https://{PUBLIC_DOMAIN}/{key}` |
| `apps/web/lib/storage/mock.ts` | `createMockAdapter()` — returns `http://localhost:3000/mock-storage/{key}` |
| `apps/web/lib/storage/get-storage.ts` | `getStorageAdapter()` factory: picks S3 when `GPX_STORAGE_ACCESS_KEY` + `GPX_STORAGE_SECRET_KEY` are set, otherwise mock |
| `.env.local.example` | Documents all five required vars: `GPX_STORAGE_BUCKET`, `ACCESS_KEY`, `SECRET_KEY`, `ACCOUNT_ID`, `PUBLIC_DOMAIN` |
| `apps/web/package.json` | `@aws-sdk/client-s3` in production dependencies |

**Gap**: No test files exist under `lib/storage/`.

---

## Patterns to Follow

### Test file structure (Vitest)
```ts
// SOURCE: apps/web/lib/gpx/parser.test.ts:1-5
import { describe, it, expect } from 'vitest'
import { parseGpx } from './parser'
```

### vi.mock for module replacement
```ts
// SOURCE: apps/web/app/api/gpx/upload/route.test.ts:14-15
vi.mock('@/lib/upload/rate-limit')
vi.mock('@/lib/storage/get-storage')
```

### Env var toggling in tests
```ts
// Pattern: save original, restore in afterEach
const saved = { ...process.env }
afterEach(() => { Object.assign(process.env, saved) })
```

### Checking which factory was called
```ts
// Pattern: mock both adapters, then check vi.mocked calls
vi.mock('./s3', () => ({ createS3Adapter: vi.fn(() => ({ upload: vi.fn() })) }))
vi.mock('./mock', () => ({ createMockAdapter: vi.fn(() => ({ upload: vi.fn() })) }))
```

### Mocking the AWS SDK
```ts
// Pattern: factory-mock the S3Client so send() is controllable
const mockSend = vi.fn().mockResolvedValue({})
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn((params) => params),
}))
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/lib/storage/mock.test.ts` | CREATE | Verify mock adapter URL format |
| `apps/web/lib/storage/get-storage.test.ts` | CREATE | Verify factory selects the right adapter based on env vars |
| `apps/web/lib/storage/s3.test.ts` | CREATE | Verify S3 adapter calls SDK with correct params and returns correct URL |

---

## Tasks

### Task 1: Mock adapter unit tests

- **File**: `apps/web/lib/storage/mock.test.ts`
- **Action**: CREATE
- **Implement**:
  - Import `createMockAdapter` from `./mock`
  - `it('upload returns localhost URL with the given key')` — call `upload('gpx/abc.gpx', Buffer.from(''), 'application/gpx+xml')` and assert the result is `'http://localhost:3000/mock-storage/gpx/abc.gpx'`
  - `it('upload URL changes when key changes')` — different key → different URL
- **Mirror**: `apps/web/lib/gpx/parser.test.ts:1-10` — same `describe/it/expect` pattern
- **Validate**: `pnpm test` (from `apps/web/`)

### Task 2: Storage factory unit tests

- **File**: `apps/web/lib/storage/get-storage.test.ts`
- **Action**: CREATE
- **Implement**:
  - `vi.mock('./s3', ...)` and `vi.mock('./mock', ...)` — both return a stub adapter
  - In `beforeEach`: clear mocks, save env, set no storage keys (so mock is selected by default)
  - In `afterEach`: restore saved env vars
  - `it('returns S3 adapter when ACCESS_KEY and SECRET_KEY are both set')`:
    - Set `process.env.GPX_STORAGE_ACCESS_KEY = 'key'` and `GPX_STORAGE_SECRET_KEY = 'secret'`
    - Call `getStorageAdapter()`
    - Assert `createS3Adapter` was called and `createMockAdapter` was not
  - `it('returns mock adapter when keys are absent')`:
    - Ensure both vars are unset
    - Call `getStorageAdapter()`
    - Assert `createMockAdapter` was called and `createS3Adapter` was not
  - `it('returns mock adapter when only one key is set')`:
    - Set only `GPX_STORAGE_ACCESS_KEY`; leave SECRET_KEY unset
    - Call `getStorageAdapter()`
    - Assert `createMockAdapter` was called
- **Mirror**: `apps/web/app/api/gpx/upload/route.test.ts:14-22` — `vi.mock` + `beforeEach` setup pattern
- **Validate**: `pnpm test` (from `apps/web/`)

### Task 3: S3 adapter unit tests

- **File**: `apps/web/lib/storage/s3.test.ts`
- **Action**: CREATE
- **Implement**:
  - Mock `@aws-sdk/client-s3`:
    ```ts
    const mockSend = vi.fn().mockResolvedValue({})
    vi.mock('@aws-sdk/client-s3', () => ({
      S3Client: vi.fn(() => ({ send: mockSend })),
      PutObjectCommand: vi.fn((params) => params),
    }))
    ```
  - In `beforeAll`: set required env vars (`GPX_STORAGE_ACCESS_KEY`, `GPX_STORAGE_SECRET_KEY`, `GPX_STORAGE_BUCKET`, `GPX_STORAGE_ACCOUNT_ID`, `GPX_STORAGE_PUBLIC_DOMAIN`)
  - Create adapter once: `const adapter = createS3Adapter()`
  - `it('calls PutObjectCommand with bucket, key, data, and contentType')`:
    - Call `await adapter.upload('gpx/uuid.gpx', Buffer.from('data'), 'application/gpx+xml')`
    - Assert `mockSend` was called once
    - Assert the `PutObjectCommand` was constructed with `Bucket`, `Key`, `Body`, `ContentType`
  - `it('returns a URL composed of PUBLIC_DOMAIN and the key')`:
    - Set `GPX_STORAGE_PUBLIC_DOMAIN = 'pub.r2.dev'`
    - Call `await adapter.upload('gpx/uuid.gpx', Buffer.from(''), 'application/gpx+xml')`
    - Assert result is `'https://pub.r2.dev/gpx/uuid.gpx'`
  - `it('propagates S3Client errors to the caller')`:
    - `mockSend.mockRejectedValueOnce(new Error('network error'))`
    - Assert `adapter.upload(...)` rejects with that error
- **Mirror**: `apps/web/app/api/gpx/upload/route.test.ts:55-65` — `vi.fn()` + `mockSend` pattern
- **Note**: `PutObjectCommand` is called as a constructor with the params object; in the mock, the `vi.fn((params) => params)` pattern lets you capture the params passed to the constructor via `vi.mocked(PutObjectCommand).mock.calls[0][0]`
- **Validate**: `pnpm test` (from `apps/web/`)

---

## Validation

```bash
cd apps/web
pnpm test          # all tests pass (new: 3 files, ~8 cases)
pnpm run build     # TypeScript strict mode
pnpm run lint      # no lint errors
```

---

## Acceptance Criteria

- [ ] `mock.test.ts`: URL format verified for different keys
- [ ] `get-storage.test.ts`: both paths (S3 / mock) tested; partial-key case covered
- [ ] `s3.test.ts`: PutObjectCommand params, URL construction, and error propagation covered
- [ ] `pnpm test` exits 0
- [ ] `pnpm run build` exits 0
