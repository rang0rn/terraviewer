import { describe, it, expect } from 'vitest'
import { createMockAdapter } from './mock'

describe('createMockAdapter', () => {
  it('upload returns a localhost URL containing the given key', async () => {
    const adapter = createMockAdapter()
    const url = await adapter.upload('gpx/abc.gpx', Buffer.from(''), 'application/gpx+xml')
    expect(url).toBe('http://localhost:3000/mock-storage/gpx/abc.gpx')
  })

  it('upload URL reflects a different key', async () => {
    const adapter = createMockAdapter()
    const url = await adapter.upload('gpx/xyz.gpx', Buffer.from(''), 'application/gpx+xml')
    expect(url).toBe('http://localhost:3000/mock-storage/gpx/xyz.gpx')
  })
})
