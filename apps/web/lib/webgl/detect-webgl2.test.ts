import { describe, it, expect } from 'vitest'
import { detectWebGL2 } from './detect-webgl2'

describe('detectWebGL2', () => {
  it('returns false in jsdom (WebGL not supported)', () => {
    // jsdom provides document.createElement but not WebGL — tests the false branch
    expect(detectWebGL2()).toBe(false)
  })

  it('does not throw when called', () => {
    expect(() => detectWebGL2()).not.toThrow()
  })
})
