import type { StorageAdapter } from './index'

export function createMockAdapter(): StorageAdapter {
  return {
    async upload(key) {
      return `http://localhost:3000/mock-storage/${key}`
    },
  }
}
