import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createS3Adapter } from './s3'

// vi.hoisted ensures mockSend is defined before the vi.mock factory runs
const mockSend = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn((params: unknown) => params),
}))

describe('createS3Adapter', () => {
  beforeAll(() => {
    process.env.GPX_STORAGE_ACCESS_KEY = 'test-key'
    process.env.GPX_STORAGE_SECRET_KEY = 'test-secret'
    process.env.GPX_STORAGE_BUCKET = 'test-bucket'
    process.env.GPX_STORAGE_ACCOUNT_ID = 'test-account'
    process.env.GPX_STORAGE_PUBLIC_DOMAIN = 'pub.r2.dev'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({})
  })

  it('calls PutObjectCommand with bucket, key, body, and content-type', async () => {
    const adapter = createS3Adapter()
    const data = Buffer.from('gpx content')
    await adapter.upload('gpx/uuid.gpx', data, 'application/gpx+xml')

    expect(vi.mocked(PutObjectCommand)).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'gpx/uuid.gpx',
      Body: data,
      ContentType: 'application/gpx+xml',
    })
    expect(mockSend).toHaveBeenCalledOnce()
  })

  it('returns a URL composed of PUBLIC_DOMAIN and the key', async () => {
    const adapter = createS3Adapter()
    const url = await adapter.upload('gpx/uuid.gpx', Buffer.from(''), 'application/gpx+xml')
    expect(url).toBe('https://pub.r2.dev/gpx/uuid.gpx')
  })

  it('propagates S3Client send errors to the caller', async () => {
    mockSend.mockRejectedValueOnce(new Error('bucket unreachable'))
    const adapter = createS3Adapter()
    await expect(
      adapter.upload('gpx/uuid.gpx', Buffer.from(''), 'application/gpx+xml')
    ).rejects.toThrow('bucket unreachable')
  })

  it('constructs S3Client with the R2 endpoint URL containing the account ID', () => {
    createS3Adapter()
    expect(vi.mocked(S3Client)).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: expect.stringContaining('test-account'),
      })
    )
  })
})
