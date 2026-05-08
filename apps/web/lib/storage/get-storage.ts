import { createS3Adapter } from './s3'
import { createMockAdapter } from './mock'
import type { StorageAdapter } from './index'

export function getStorageAdapter(): StorageAdapter {
  if (process.env.GPX_STORAGE_ACCESS_KEY && process.env.GPX_STORAGE_SECRET_KEY) {
    return createS3Adapter()
  }
  return createMockAdapter()
}
