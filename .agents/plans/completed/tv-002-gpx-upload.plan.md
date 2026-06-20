# Plan: TV-002 — GPX Upload (Full Vertical Slice)

## Summary

Implement the complete GPX upload feature end-to-end: a drag-and-drop upload UI (`components/upload/gpx-dropzone.tsx`), the `POST /api/gpx/upload` API route with GPX parsing and elevation validation, an S3-compatible storage adapter (Cloudflare R2 / any S3), a simple in-memory rate limiter, and a privacy notice. On success, `gpxUrl` and `routeBounds` are written into Zustand and the stepper automatically advances to the 2D Map step. This plan covers TV-002 (upload UI), TV-003 (GPX parsing & elevation validation), TV-004 (storage integration), TV-005 (upload security), and TV-022 (DSGVO privacy notice) as a single shippable slice. TV-007 (2D Map) unblocks once this plan is complete.

## User Story

As a customer,  
I want to upload a `.gpx` file through a clear drag-and-drop or file-picker interface,  
so that my personal route becomes the basis for the terrain poster.

## Metadata

| Field | Value |
|---|---|
| Type | NEW_CAPABILITY |
| Complexity | MEDIUM |
| Systems Affected | `components/upload/`, `features/gpx/`, `lib/gpx/`, `lib/storage/`, `lib/upload/`, `app/api/gpx/upload/`, `types/` |
| Jira Issue | TV-002 |
| Also covers | TV-003, TV-004, TV-005, TV-022 |
| Blocks | TV-007 |

---

## Greenfield Note

No API routes exist yet. No `lib/` utilities beyond the Zustand store. No test runner is configured. This plan bootstraps all three.

---

## Patterns to Follow

### Client Component declaration
```ts
// SOURCE: apps/web/components/ui/stepper.tsx:1-4
'use client'

import { useConfiguratorStore } from '@/lib/store/configurator'
import type { StepId } from '@/types/configurator'
```
Rule: `'use client'` only when using hooks, events, or browser APIs.

### Zustand store read + update
```ts
// SOURCE: apps/web/components/ui/step-navigation.tsx:9-12
const { currentStep, advanceStep, retreatStep, canAdvance } = useConfiguratorStore()

// SOURCE: apps/web/lib/store/configurator.ts:33
updateConfig: (key, value) => set((s) => ({ ...s, [key]: value })),
```
Use `updateConfig('gpxUrl', url)` and `updateConfig('routeBounds', bounds)` to persist upload result.

### Type definitions
```ts
// SOURCE: apps/web/types/configurator.ts:1-7
export type StepId = 'upload' | 'map' | 'preview' | 'mockup' | 'cart'
export type RouteBounds = {
  minLat: number; maxLat: number; minLng: number; maxLng: number
}
```
Use `type` for data shapes, `interface` for React props.

### Next.js App Router API route (new pattern — first in project)
```ts
// Convention: apps/web/app/api/{path}/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // ...
  return NextResponse.json({ success: true, ... })
  // or
  return NextResponse.json({ success: false, errorCode: '...', message: '...' }, { status: 400 })
}
```

### Path alias
```json
// SOURCE: apps/web/tsconfig.json
"paths": { "@/*": ["./*"] }
```
All imports within `apps/web/` use `@/` prefix. `@/types/configurator`, `@/lib/store/configurator`, etc.

---

## Files to Create

| File | Purpose |
|---|---|
| `apps/web/vitest.config.ts` | Vitest test runner config |
| `apps/web/vitest.setup.ts` | @testing-library/jest-dom matchers |
| `apps/web/types/upload.ts` | UploadResponse, UploadErrorCode types |
| `apps/web/lib/gpx/parser.ts` | Parse GPX XML → trackpoints, routeBounds, hasElevation |
| `apps/web/lib/gpx/parser.test.ts` | Unit tests for parser |
| `apps/web/lib/storage/index.ts` | StorageAdapter interface |
| `apps/web/lib/storage/s3.ts` | S3/R2 implementation (PutObjectCommand) |
| `apps/web/lib/storage/mock.ts` | In-memory mock for local dev (no credentials needed) |
| `apps/web/lib/storage/get-storage.ts` | Factory: returns real or mock based on env vars |
| `apps/web/lib/upload/rate-limit.ts` | In-memory per-IP rate limiter (10 req/min) |
| `apps/web/app/api/gpx/upload/route.ts` | POST handler: validate → parse → store → respond |
| `apps/web/features/gpx/validate-client.ts` | Client-side file validation (extension, MIME, size) |
| `apps/web/features/gpx/validate-client.test.ts` | Unit tests for client validator |
| `apps/web/components/upload/gpx-dropzone.tsx` | Drag-drop upload UI (Client Component) |

## Files to Update

| File | Change |
|---|---|
| `apps/web/package.json` | Add `fast-xml-parser`, `@aws-sdk/client-s3`; add test deps and `"test": "vitest"` script |
| `apps/web/app/product-configurator/upload/page.tsx` | Replace stub with `<GpxDropzone />` |

---

## Tasks

Execute in order. Each task is independently buildable.

---

### Task 1: Configure test runner

- **Files**: `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`
- **Action**: CREATE
- **Implement**:

Add to `apps/web/package.json` devDependencies:
```json
"vitest": "^2.0.0",
"@vitejs/plugin-react": "^4.0.0",
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.0.0",
"jsdom": "^25.0.0"
```
Add script: `"test": "vitest run"` (and `"test:watch": "vitest"`)

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- **Validate**: `pnpm install && pnpm test` (no tests yet — should exit with "no test files found" or 0 tests)

---

### Task 2: Add runtime dependencies

- **File**: `apps/web/package.json`
- **Action**: UPDATE
- **Implement**: Add to `dependencies`:
```json
"fast-xml-parser": "^4.5.0",
"@aws-sdk/client-s3": "^3.700.0"
```
Then run `pnpm install`.

`fast-xml-parser` — pure-JS XML parser, works in Node.js + edge runtime. No DOMParser dependency.  
`@aws-sdk/client-s3` — PutObjectCommand for upload; works with Cloudflare R2 (S3-compatible endpoint).

- **Validate**: `pnpm run build` still passes

---

### Task 3: Upload types

- **File**: `apps/web/types/upload.ts`
- **Action**: CREATE
- **Implement**:

```ts
import type { RouteBounds } from '@/types/configurator'

export type UploadErrorCode =
  | 'NO_ELEVATION_DATA'
  | 'INVALID_GPX_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'INVALID_MIME_TYPE'
  | 'STORAGE_ERROR'
  | 'RATE_LIMIT_EXCEEDED'

export type UploadSuccessResponse = {
  success: true
  gpxUrl: string
  fileName: string
  hasElevation: boolean
  routeBounds: RouteBounds
}

export type UploadErrorResponse = {
  success: false
  errorCode: UploadErrorCode
  message: string
}

export type UploadResponse = UploadSuccessResponse | UploadErrorResponse
```

- **Validate**: Import in another file — zero TypeScript errors

---

### Task 4: GPX parser library

- **Files**: `apps/web/lib/gpx/parser.ts`, `apps/web/lib/gpx/parser.test.ts`
- **Action**: CREATE
- **Implement**:

`apps/web/lib/gpx/parser.ts`:
```ts
import { XMLParser } from 'fast-xml-parser'
import type { RouteBounds } from '@/types/configurator'

type TrackPoint = { lat: number; lng: number; ele: number | null }

type ParsedGpx = {
  trackPoints: TrackPoint[]
  routeBounds: RouteBounds
  hasElevation: boolean
}

export function parseGpx(xmlContent: string): ParsedGpx {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['trkpt', 'trkseg', 'trk'].includes(name),
  })

  let parsed: unknown
  try {
    parsed = parser.parse(xmlContent)
  } catch {
    throw new Error('INVALID_GPX_FORMAT')
  }

  // Navigate to trackpoints: gpx.trk[].trkseg[].trkpt[]
  const gpxNode = (parsed as Record<string, unknown>)['gpx']
  if (!gpxNode || typeof gpxNode !== 'object') throw new Error('INVALID_GPX_FORMAT')

  const trks = (gpxNode as Record<string, unknown>)['trk'] as unknown[] | undefined
  if (!trks || trks.length === 0) throw new Error('INVALID_GPX_FORMAT')

  const trackPoints: TrackPoint[] = []

  for (const trk of trks) {
    const trkObj = trk as Record<string, unknown>
    const trksegs = trkObj['trkseg'] as unknown[] | undefined
    if (!trksegs) continue
    for (const seg of trksegs) {
      const segObj = seg as Record<string, unknown>
      const trkpts = segObj['trkpt'] as unknown[] | undefined
      if (!trkpts) continue
      for (const pt of trkpts) {
        const ptObj = pt as Record<string, unknown>
        const lat = parseFloat(String(ptObj['@_lat'] ?? ''))
        const lng = parseFloat(String(ptObj['@_lon'] ?? ''))
        const ele = ptObj['ele'] != null ? parseFloat(String(ptObj['ele'])) : null
        if (!isNaN(lat) && !isNaN(lng)) {
          trackPoints.push({ lat, lng, ele })
        }
      }
    }
  }

  if (trackPoints.length === 0) throw new Error('INVALID_GPX_FORMAT')

  const lats = trackPoints.map((p) => p.lat)
  const lngs = trackPoints.map((p) => p.lng)
  const routeBounds: RouteBounds = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  }

  const hasElevation = trackPoints.some((p) => p.ele !== null && p.ele !== 0)

  return { trackPoints, routeBounds, hasElevation }
}
```

`apps/web/lib/gpx/parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseGpx } from './parser'

const VALID_GPX_WITH_ELE = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="48.1" lon="11.5"><ele>500</ele></trkpt>
    <trkpt lat="48.2" lon="11.7"><ele>520</ele></trkpt>
  </trkseg></trk>
</gpx>`

const VALID_GPX_NO_ELE = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="48.1" lon="11.5"></trkpt>
    <trkpt lat="48.2" lon="11.7"></trkpt>
  </trkseg></trk>
</gpx>`

const INVALID_XML = `not xml at all <<<`

describe('parseGpx', () => {
  it('parses valid GPX and returns correct bounds', () => {
    const result = parseGpx(VALID_GPX_WITH_ELE)
    expect(result.trackPoints).toHaveLength(2)
    expect(result.routeBounds.minLat).toBe(48.1)
    expect(result.routeBounds.maxLat).toBe(48.2)
    expect(result.routeBounds.minLng).toBe(11.5)
    expect(result.routeBounds.maxLng).toBe(11.7)
  })

  it('detects elevation when ele tags are present', () => {
    const result = parseGpx(VALID_GPX_WITH_ELE)
    expect(result.hasElevation).toBe(true)
  })

  it('detects missing elevation when ele tags are absent', () => {
    const result = parseGpx(VALID_GPX_NO_ELE)
    expect(result.hasElevation).toBe(false)
  })

  it('throws INVALID_GPX_FORMAT for malformed XML', () => {
    expect(() => parseGpx(INVALID_XML)).toThrow('INVALID_GPX_FORMAT')
  })

  it('throws INVALID_GPX_FORMAT for XML without trk element', () => {
    expect(() => parseGpx('<gpx><wpt lat="1" lon="2"/></gpx>')).toThrow('INVALID_GPX_FORMAT')
  })
})
```

- **Validate**: `pnpm test` — all 5 parser tests pass

---

### Task 5: Storage adapter

- **Files**: `lib/storage/index.ts`, `lib/storage/s3.ts`, `lib/storage/mock.ts`, `lib/storage/get-storage.ts`
- **Action**: CREATE
- **Mirror**: No existing pattern — establish here; follow same abstract-interface style

`apps/web/lib/storage/index.ts` (interface):
```ts
export interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<string>
}
```

`apps/web/lib/storage/s3.ts`:
```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { StorageAdapter } from './index'

export function createS3Adapter(): StorageAdapter {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.GPX_STORAGE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.GPX_STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.GPX_STORAGE_SECRET_KEY!,
    },
  })
  const bucket = process.env.GPX_STORAGE_BUCKET!

  return {
    async upload(key, data, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType })
      )
      // R2 public URL pattern — adjust if using custom domain
      return `https://${process.env.GPX_STORAGE_PUBLIC_DOMAIN}/${key}`
    },
  }
}
```

`apps/web/lib/storage/mock.ts`:
```ts
import type { StorageAdapter } from './index'

// Used in development when GPX_STORAGE_* vars are not set.
// Files are not actually stored; a stable fake URL is returned.
export function createMockAdapter(): StorageAdapter {
  return {
    async upload(key) {
      return `http://localhost:3000/mock-storage/${key}`
    },
  }
}
```

`apps/web/lib/storage/get-storage.ts`:
```ts
import { createS3Adapter } from './s3'
import { createMockAdapter } from './mock'
import type { StorageAdapter } from './index'

export function getStorageAdapter(): StorageAdapter {
  if (process.env.GPX_STORAGE_ACCESS_KEY && process.env.GPX_STORAGE_SECRET_KEY) {
    return createS3Adapter()
  }
  return createMockAdapter()
}
```

- **Note on env var**: Add `GPX_STORAGE_ACCOUNT_ID` and `GPX_STORAGE_PUBLIC_DOMAIN` to `.env.local.example` (Cloudflare R2-specific; S3 users override the endpoint in `s3.ts`).
- **Validate**: `pnpm run build` — types resolve, no errors

---

### Task 6: In-memory rate limiter

- **File**: `apps/web/lib/upload/rate-limit.ts`
- **Action**: CREATE
- **Implement**:

```ts
const MAX_REQUESTS = 10
const WINDOW_MS = 60_000

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (entry.count >= MAX_REQUESTS) return false

  entry.count++
  return true
}
```

Note: This is in-process only. In a multi-instance deployment (Vercel), use Upstash Redis. For MVP single-instance, this is sufficient.

- **Validate**: `pnpm run build`

---

### Task 7: Upload API route

- **File**: `apps/web/app/api/gpx/upload/route.ts`
- **Action**: CREATE
- **Implement**:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { parseGpx } from '@/lib/gpx/parser'
import { getStorageAdapter } from '@/lib/storage/get-storage'
import { checkRateLimit } from '@/lib/upload/rate-limit'
import type { UploadResponse } from '@/types/upload'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = ['application/gpx+xml', 'text/xml', 'application/xml', 'application/octet-stream']

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Zu viele Anfragen. Bitte warte eine Minute.' },
      { status: 429 }
    )
  }

  // Must be multipart
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_MIME_TYPE', message: 'Ungültiges Dateiformat.' },
      { status: 400 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_GPX_FORMAT', message: 'Datei konnte nicht gelesen werden.' },
      { status: 400 }
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_GPX_FORMAT', message: 'Keine Datei gefunden.' },
      { status: 400 }
    )
  }

  // File size check
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, errorCode: 'FILE_TOO_LARGE', message: 'Datei zu groß. Maximal 10 MB erlaubt.' },
      { status: 413 }
    )
  }

  // Extension check
  if (!file.name.toLowerCase().endsWith('.gpx')) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_MIME_TYPE', message: 'Nur .gpx-Dateien werden akzeptiert.' },
      { status: 400 }
    )
  }

  // MIME type check (browser-reported; not magic bytes but sufficient for MVP)
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_MIME_TYPE', message: 'Ungültiger Dateityp. Nur .gpx-Dateien erlaubt.' },
      { status: 400 }
    )
  }

  // Parse GPX
  const text = await file.text()
  let parsed
  try {
    parsed = parseGpx(text)
  } catch (err) {
    const code = err instanceof Error ? err.message : 'INVALID_GPX_FORMAT'
    if (code === 'NO_ELEVATION_DATA') {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'NO_ELEVATION_DATA',
          message: 'Deine GPX-Datei enthält keine Höhenwerte. Bitte lade eine GPX-Datei mit Höheninformationen hoch.',
        },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_GPX_FORMAT', message: 'Die GPX-Datei konnte nicht gelesen werden. Bitte prüfe das Dateiformat.' },
      { status: 422 }
    )
  }

  if (!parsed.hasElevation) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'NO_ELEVATION_DATA',
        message: 'Deine GPX-Datei enthält keine Höhenwerte. Bitte lade eine GPX-Datei mit Höheninformationen hoch.',
      },
      { status: 422 }
    )
  }

  // Store file
  const key = `gpx/${crypto.randomUUID()}.gpx`
  let gpxUrl: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const storage = getStorageAdapter()
    gpxUrl = await storage.upload(key, buffer, 'application/gpx+xml')
  } catch {
    return NextResponse.json(
      { success: false, errorCode: 'STORAGE_ERROR', message: 'Datei konnte nicht gespeichert werden. Bitte versuche es erneut.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    gpxUrl,
    fileName: file.name,
    hasElevation: true,
    routeBounds: parsed.routeBounds,
  })
}
```

- **Validate**: `pnpm run build`; manually test with `curl` (see E2E section)

---

### Task 8: Client-side file validation

- **Files**: `apps/web/features/gpx/validate-client.ts`, `apps/web/features/gpx/validate-client.test.ts`
- **Action**: CREATE
- **Implement**:

`apps/web/features/gpx/validate-client.ts`:
```ts
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export function validateGpxFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.gpx')) {
    return 'Nur .gpx-Dateien werden akzeptiert.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Datei zu groß (maximal 10 MB).'
  }
  return null
}
```

`apps/web/features/gpx/validate-client.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateGpxFile } from './validate-client'

function makeFile(name: string, size = 100): File {
  return new File(['x'.repeat(size)], name, { type: 'application/gpx+xml' })
}

describe('validateGpxFile', () => {
  it('returns null for a valid .gpx file', () => {
    expect(validateGpxFile(makeFile('route.gpx'))).toBeNull()
  })

  it('rejects non-.gpx extension', () => {
    expect(validateGpxFile(makeFile('route.kml'))).toMatch(/gpx/)
  })

  it('rejects uppercase .GPX extension (case-insensitive check)', () => {
    expect(validateGpxFile(makeFile('route.GPX'))).toBeNull()
  })

  it('rejects files over 10 MB', () => {
    expect(validateGpxFile(makeFile('big.gpx', 11 * 1024 * 1024))).toMatch(/groß/)
  })
})
```

- **Validate**: `pnpm test` — 4 validation tests pass

---

### Task 9: GpxDropzone component

- **File**: `apps/web/components/upload/gpx-dropzone.tsx`
- **Action**: CREATE
- **Mirror**: `apps/web/components/ui/step-navigation.tsx:1-20` — Client Component, Zustand store + router pattern
- **Implement**:

```tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfiguratorStore } from '@/lib/store/configurator'
import { validateGpxFile } from '@/features/gpx/validate-client'
import type { UploadResponse } from '@/types/upload'

type UploadState = 'idle' | 'dragging' | 'uploading' | 'error'

export function GpxDropzone() {
  const router = useRouter()
  const { updateConfig, advanceStep } = useConfiguratorStore()
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const validationError = validateGpxFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      setUploadState('error')
      return
    }

    setUploadState('uploading')
    setErrorMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/gpx/upload', { method: 'POST', body: formData })
      const data: UploadResponse = await res.json()

      if (!data.success) {
        setErrorMessage(data.message)
        setUploadState('error')
        return
      }

      updateConfig('gpxUrl', data.gpxUrl)
      updateConfig('routeBounds', data.routeBounds)
      advanceStep()
      router.push('/product-configurator/map')
    } catch {
      setErrorMessage('Upload fehlgeschlagen. Bitte versuche es erneut.')
      setUploadState('error')
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setUploadState('idle')
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so the same file can be re-selected after an error
    e.target.value = ''
  }

  const isUploading = uploadState === 'uploading'

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      {/* Privacy notice (TV-022) */}
      <p className="text-xs text-ink/40 text-center">
        Deine GPX-Datei wird ausschließlich zur Erstellung deines Posters verwendet und sicher gespeichert.{' '}
        <a href="/datenschutz" className="underline hover:text-ink/60">
          Datenschutzhinweis
        </a>
      </p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="GPX-Datei hochladen"
        onDragOver={(e) => { e.preventDefault(); setUploadState('dragging') }}
        onDragLeave={() => setUploadState('idle')}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        className={[
          'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors cursor-pointer',
          uploadState === 'dragging' ? 'border-ink bg-ink/5' : 'border-ink/20 hover:border-ink/40',
          isUploading ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        {isUploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
            <p className="text-sm text-ink/60">Datei wird hochgeladen…</p>
          </>
        ) : (
          <>
            <svg className="h-10 w-10 text-ink/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div>
              <p className="text-sm font-medium text-ink">GPX-Datei hierher ziehen</p>
              <p className="mt-1 text-xs text-ink/40">oder</p>
            </div>
            <button
              type="button"
              className="rounded bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-ink/80"
            >
              Datei auswählen
            </button>
            <p className="text-xs text-ink/40">Nur .gpx-Dateien, max. 10 MB</p>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        className="sr-only"
        onChange={onInputChange}
        aria-hidden="true"
      />

      {/* Error message */}
      {uploadState === 'error' && errorMessage && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
```

- **Validate**: `pnpm run build` — component compiles; page renders in dev server

---

### Task 10: Update upload page

- **File**: `apps/web/app/product-configurator/upload/page.tsx`
- **Action**: UPDATE
- **Implement**: Replace the stub with the real component:

```tsx
import { GpxDropzone } from '@/components/upload/gpx-dropzone'

export default function UploadStep() {
  return (
    <div className="py-8">
      <div className="mb-8 text-center">
        <h2 className="text-lg font-semibold text-ink">GPX-Datei hochladen</h2>
        <p className="mt-1 text-sm text-ink/60">
          Exportiere deine Route aus Komoot, Garmin oder Strava als .gpx-Datei und lade sie hier hoch.
        </p>
      </div>
      <GpxDropzone />
    </div>
  )
}
```

- **Validate**: `pnpm run build`; dev server — Upload step shows the drop zone

---

### Task 11: Update .env.local.example

- **File**: `.env.local.example` (repo root)
- **Action**: UPDATE
- **Implement**: Add two new R2-specific variables:

```env
# Cloudflare R2 — Account ID (found in R2 dashboard)
GPX_STORAGE_ACCOUNT_ID=
# R2 public bucket domain (e.g. pub-xyz.r2.dev or custom domain)
GPX_STORAGE_PUBLIC_DOMAIN=
```

These are additive to the existing vars. Without them, the mock storage adapter activates automatically.

- **Validate**: File committed; actual `.env.local` absent

---

## Validation

```bash
# From project root
pnpm install

# Type check + build
pnpm run build

# Lint
pnpm run lint

# Tests
pnpm test
```

Expected state after all tasks complete:

- `pnpm run build` exits 0 — zero TypeScript errors in strict mode
- `pnpm test` passes — 9 unit tests (5 parser + 4 validator)
- `pnpm run dev` starts; visiting `/product-configurator/upload` shows drag-drop zone, privacy notice, and "Datei auswählen" button
- Dropping a non-.gpx file shows inline German error message
- Uploading a valid `.gpx` file (with elevation) POSTs to `/api/gpx/upload`, receives mock URL in dev mode, writes to Zustand, and navigates to `/product-configurator/map`
- `Next` button on Upload step is disabled (confirmed: `canAdvance()` returns false when `gpxUrl === null`)

---

## End-to-End Tests

Run dev server (`pnpm run dev`), then perform each check:

### E2E-1: Page loads correctly
- Visit `http://localhost:3000/product-configurator/upload`
- **Expected**: Drop zone visible, "Datei auswählen" button visible, privacy notice text visible, "Next" button disabled

### E2E-2: Wrong file type rejected client-side
- Drag a `.pdf` or `.jpg` file onto the drop zone
- **Expected**: Red error banner appears with German message containing ".gpx"

### E2E-3: Valid GPX upload (mock storage)
- Select or drop a valid `.gpx` file with elevation data
- **Expected**: Spinner appears during upload, then app navigates to `/product-configurator/map`; Zustand store has `gpxUrl` and `routeBounds` set (visible via React DevTools or by checking that the "Next" button would be enabled if returning to Upload)

### E2E-4: API direct test (curl)
```bash
# Valid upload
curl -X POST http://localhost:3000/api/gpx/upload \
  -F "file=@path/to/route.gpx" \
  -w "\nHTTP %{http_code}\n"
# Expected: {"success":true,"gpxUrl":"http://localhost:3000/mock-storage/gpx/...","routeBounds":{...},...}

# Missing elevation
curl -X POST http://localhost:3000/api/gpx/upload \
  -F "file=@path/to/no-elevation.gpx" \
  -w "\nHTTP %{http_code}\n"
# Expected: {"success":false,"errorCode":"NO_ELEVATION_DATA",...} HTTP 422

# Wrong type
curl -X POST http://localhost:3000/api/gpx/upload \
  -F "file=@path/to/image.png" \
  -w "\nHTTP %{http_code}\n"
# Expected: {"success":false,"errorCode":"INVALID_MIME_TYPE",...} HTTP 400
```

### E2E-5: Mobile tap
- Open dev server on mobile (or Chrome devtools mobile emulation, 375px width)
- Tap drop zone → native file picker opens; selecting a `.gpx` file triggers upload

---

## Acceptance Criteria

- [ ] Upload step shows drag-drop zone + "Datei auswählen" button on load
- [ ] Non-.gpx file rejected with German inline error message
- [ ] Valid `.gpx` upload triggers spinner/loading state
- [ ] Successful upload stores `gpxUrl` + `routeBounds` in Zustand and navigates to `/product-configurator/map`
- [ ] API returns `NO_ELEVATION_DATA` (HTTP 422) for GPX without `<ele>` tags
- [ ] API returns `INVALID_GPX_FORMAT` (HTTP 422) for malformed XML
- [ ] File size checked both client-side (before upload) and server-side (HTTP 413 if exceeded)
- [ ] MIME type checked server-side; non-gpx MIME rejected (HTTP 400)
- [ ] Rate limiter returns HTTP 429 after 10 requests/min per IP
- [ ] Privacy notice visible above the upload zone
- [ ] `pnpm run build` passes with strict TypeScript
- [ ] `pnpm test` passes — 9 unit tests green
- [ ] `.env.local.example` updated with new R2 vars; storage mock activates without credentials

---

## Risks

| Risk | Mitigation |
|---|---|
| Vercel serverless body size limit (4.5 MB default) | Check file size server-side before reading full body; for large files, consider streaming or direct-to-R2 presigned upload (post-MVP). 10 MB GPX files are rare; document Vercel Pro plan requirement for large files. |
| `fast-xml-parser` namespace handling | GPX files sometimes use namespace prefixes (`<gpx:trkpt>`). Test with real-world GPX samples from Garmin/Komoot. If namespaces are found, add `removeNSPrefix: true` to XMLParser options. |
| R2 CORS for browser direct upload | Not relevant for MVP — uploads go through the Next.js API route, not directly to R2. |
| In-memory rate limiter per-instance | Acceptable for MVP. In multi-instance Vercel deploy, add `@upstash/ratelimit` as a drop-in replacement for `checkRateLimit`. |
| Zustand store state lost on hard refresh | Expected behavior. The user must re-upload after a refresh. Persistence via `zustand/middleware` is post-MVP. |
