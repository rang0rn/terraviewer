# Implementation Report

**Plan**: `.agents/plans/tv-004-gpx-storage-integration.plan.md`
**Branch**: `feature/tv-002-gpx-upload`
**Status**: COMPLETE

## Summary

TV-004 (GPX Storage Integration) core implementation was already complete. This pass added unit tests for all three storage module files: the mock adapter, the factory selector, and the S3/R2 adapter (with mocked AWS SDK).

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Mock adapter unit tests | `apps/web/lib/storage/mock.test.ts` | ✅ |
| 2 | Storage factory unit tests | `apps/web/lib/storage/get-storage.test.ts` | ✅ |
| 3 | S3 adapter unit tests | `apps/web/lib/storage/s3.test.ts` | ✅ |

## Validation Results

| Check | Result |
|-------|--------|
| Type check (`pnpm run build`) | ✅ |
| Lint (`pnpm run lint`) | ✅ |
| Tests (`pnpm test`) | ✅ 32 passed (7 files) |

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `apps/web/lib/storage/mock.test.ts` | CREATE | +18 |
| `apps/web/lib/storage/get-storage.test.ts` | CREATE | +53 |
| `apps/web/lib/storage/s3.test.ts` | CREATE | +57 |

## Deviations from Plan

**Extra test added in `get-storage.test.ts`**: Added a 4th case — "returns mock when only SECRET_KEY is set" — to fully cover both single-key partial configurations. The plan specified 3 scenarios; this makes the factory logic exhaustively tested.

**`vi.hoisted()` for `mockSend` in `s3.test.ts`**: The plan suggested a plain `const mockSend = vi.fn()`. Vitest hoists `vi.mock` calls above `const` declarations, which means a top-level `const` wouldn't be defined when the mock factory runs. Using `vi.hoisted(() => vi.fn())` is the correct Vitest pattern and was substituted without any behaviour change.

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `lib/storage/mock.test.ts` | URL with given key; URL changes with different key |
| `lib/storage/get-storage.test.ts` | S3 when both keys set; mock when both absent; mock when only ACCESS_KEY set; mock when only SECRET_KEY set |
| `lib/storage/s3.test.ts` | PutObjectCommand params; URL from PUBLIC_DOMAIN; error propagation; S3Client endpoint contains account ID |
