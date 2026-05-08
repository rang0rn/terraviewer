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

  it('accepts uppercase .GPX extension (case-insensitive check)', () => {
    expect(validateGpxFile(makeFile('route.GPX'))).toBeNull()
  })

  it('rejects files over 10 MB', () => {
    expect(validateGpxFile(makeFile('big.gpx', 11 * 1024 * 1024))).toMatch(/groß/)
  })
})
