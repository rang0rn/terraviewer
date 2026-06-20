import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createS3Adapter } from './s3'
import { createMockAdapter } from './mock'
import { getStorageAdapter } from './get-storage'

vi.mock('./s3', () => ({
  createS3Adapter: vi.fn(() => ({ upload: vi.fn() })),
}))
vi.mock('./mock', () => ({
  createMockAdapter: vi.fn(() => ({ upload: vi.fn() })),
}))

describe('getStorageAdapter', () => {
  let savedAccessKey: string | undefined
  let savedSecretKey: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    savedAccessKey = process.env.GPX_STORAGE_ACCESS_KEY
    savedSecretKey = process.env.GPX_STORAGE_SECRET_KEY
    delete process.env.GPX_STORAGE_ACCESS_KEY
    delete process.env.GPX_STORAGE_SECRET_KEY
  })

  afterEach(() => {
    if (savedAccessKey !== undefined) process.env.GPX_STORAGE_ACCESS_KEY = savedAccessKey
    else delete process.env.GPX_STORAGE_ACCESS_KEY
    if (savedSecretKey !== undefined) process.env.GPX_STORAGE_SECRET_KEY = savedSecretKey
    else delete process.env.GPX_STORAGE_SECRET_KEY
  })

  it('returns the S3 adapter when both ACCESS_KEY and SECRET_KEY are set', () => {
    process.env.GPX_STORAGE_ACCESS_KEY = 'test-key'
    process.env.GPX_STORAGE_SECRET_KEY = 'test-secret'
    getStorageAdapter()
    expect(createS3Adapter).toHaveBeenCalledOnce()
    expect(createMockAdapter).not.toHaveBeenCalled()
  })

  it('returns the mock adapter when both keys are absent', () => {
    getStorageAdapter()
    expect(createMockAdapter).toHaveBeenCalledOnce()
    expect(createS3Adapter).not.toHaveBeenCalled()
  })

  it('returns the mock adapter when only ACCESS_KEY is set', () => {
    process.env.GPX_STORAGE_ACCESS_KEY = 'test-key'
    getStorageAdapter()
    expect(createMockAdapter).toHaveBeenCalledOnce()
    expect(createS3Adapter).not.toHaveBeenCalled()
  })

  it('returns the mock adapter when only SECRET_KEY is set', () => {
    process.env.GPX_STORAGE_SECRET_KEY = 'test-secret'
    getStorageAdapter()
    expect(createMockAdapter).toHaveBeenCalledOnce()
    expect(createS3Adapter).not.toHaveBeenCalled()
  })
})
