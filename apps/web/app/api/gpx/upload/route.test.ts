import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit } from '@/lib/upload/rate-limit'
import { getStorageAdapter } from '@/lib/storage/get-storage'
import type { NextRequest } from 'next/server'
import type { UploadResponse } from '@/types/upload'
import type { StorageAdapter } from '@/lib/storage'

vi.mock('@/lib/upload/rate-limit')
vi.mock('@/lib/storage/get-storage')

import { POST } from './route'

const FAKE_GPX_URL = 'https://storage.example.com/gpx/test.gpx'

const VALID_GPX = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="48.1" lon="11.5"><ele>500</ele></trkpt>
    <trkpt lat="48.2" lon="11.7"><ele>520</ele></trkpt>
  </trkseg></trk>
</gpx>`

const GPX_NO_ELE = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="48.1" lon="11.5"></trkpt>
    <trkpt lat="48.2" lon="11.7"></trkpt>
  </trkseg></trk>
</gpx>`

// jsdom's File lacks Blob.text() / Blob.arrayBuffer() — build a compliant
// file-like object that still passes `instanceof File` via prototype chain.
function makeGpxFile(content: string, name = 'route.gpx', overrideSize?: number): File {
  const encoded = new TextEncoder().encode(content)
  const fileLike: File = Object.create(File.prototype)
  Object.defineProperties(fileLike, {
    name: { value: name, configurable: true },
    size: { value: overrideSize ?? encoded.length, configurable: true },
    type: { value: 'application/gpx+xml', configurable: true },
    text: { value: () => Promise.resolve(content), configurable: true },
    arrayBuffer: { value: () => Promise.resolve(encoded.buffer.slice(0)), configurable: true },
  })
  return fileLike
}

function makeRequest({
  contentType = 'multipart/form-data; boundary=abc123',
  file,
  ip = '10.0.0.1',
}: {
  contentType?: string
  file?: File
  ip?: string
} = {}): NextRequest {
  const fakeFormData = {
    get: (key: string) => (key === 'file' ? (file ?? null) : null),
  }

  return {
    headers: {
      get: (name: string) => {
        if (name === 'content-type') return contentType
        if (name === 'x-forwarded-for') return ip
        return null
      },
    },
    formData: async () => fakeFormData as unknown as FormData,
  } as unknown as NextRequest
}

describe('POST /api/gpx/upload', () => {
  const mockUpload = vi.fn<StorageAdapter['upload']>()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockReturnValue(true)
    vi.mocked(getStorageAdapter).mockReturnValue({ upload: mockUpload })
    mockUpload.mockResolvedValue(FAKE_GPX_URL)
  })

  it('returns success with gpxUrl and routeBounds for a valid GPX', async () => {
    const res = await POST(makeRequest({ file: makeGpxFile(VALID_GPX) }))
    const body = (await res.json()) as UploadResponse
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    if (body.success) {
      expect(body.hasElevation).toBe(true)
      expect(body.gpxUrl).toBe(FAKE_GPX_URL)
      expect(body.routeBounds).toMatchObject({
        minLat: 48.1,
        maxLat: 48.2,
        minLng: 11.5,
        maxLng: 11.7,
      })
    }
  })

  it('returns NO_ELEVATION_DATA for GPX without <ele> tags', async () => {
    const res = await POST(makeRequest({ file: makeGpxFile(GPX_NO_ELE) }))
    const body = (await res.json()) as UploadResponse
    expect(res.status).toBe(422)
    expect(body.success).toBe(false)
    if (!body.success) expect(body.errorCode).toBe('NO_ELEVATION_DATA')
  })

  it('returns INVALID_GPX_FORMAT for malformed XML', async () => {
    const res = await POST(makeRequest({ file: makeGpxFile('not xml <<<', 'bad.gpx') }))
    const body = (await res.json()) as UploadResponse
    expect(res.status).toBe(422)
    expect(body.success).toBe(false)
    if (!body.success) expect(body.errorCode).toBe('INVALID_GPX_FORMAT')
  })

  it('returns 400 when content-type is not multipart/form-data', async () => {
    const res = await POST(makeRequest({ contentType: 'application/json' }))
    const body = (await res.json()) as UploadResponse
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('returns FILE_TOO_LARGE for a file exceeding 10 MB', async () => {
    const file = makeGpxFile('x', 'big.gpx', 11 * 1024 * 1024)
    const res = await POST(makeRequest({ file }))
    const body = (await res.json()) as UploadResponse
    expect(res.status).toBe(413)
    expect(body.success).toBe(false)
    if (!body.success) expect(body.errorCode).toBe('FILE_TOO_LARGE')
  })

  it('returns INVALID_MIME_TYPE for a non-.gpx file extension', async () => {
    const res = await POST(makeRequest({ file: makeGpxFile(VALID_GPX, 'route.kml') }))
    const body = (await res.json()) as UploadResponse
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    if (!body.success) expect(body.errorCode).toBe('INVALID_MIME_TYPE')
  })

  it('returns RATE_LIMIT_EXCEEDED when the rate limit is exhausted', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const res = await POST(makeRequest())
    const body = (await res.json()) as UploadResponse
    expect(res.status).toBe(429)
    expect(body.success).toBe(false)
    if (!body.success) expect(body.errorCode).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('returns STORAGE_ERROR when the storage upload throws', async () => {
    mockUpload.mockRejectedValueOnce(new Error('bucket unreachable'))
    const res = await POST(makeRequest({ file: makeGpxFile(VALID_GPX) }))
    const body = (await res.json()) as UploadResponse
    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    if (!body.success) expect(body.errorCode).toBe('STORAGE_ERROR')
  })
})
