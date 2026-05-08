import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from './rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request from a new IP', () => {
    expect(checkRateLimit('192.168.1.1')).toBe(true)
  })

  it('allows up to 10 requests within the 60-second window', () => {
    const ip = '192.168.2.1'
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ip)).toBe(true)
    }
  })

  it('blocks the 11th request within the window', () => {
    const ip = '192.168.3.1'
    for (let i = 0; i < 10; i++) checkRateLimit(ip)
    expect(checkRateLimit(ip)).toBe(false)
  })

  it('resets the counter after the 60-second window expires', () => {
    const ip = '192.168.4.1'
    for (let i = 0; i < 10; i++) checkRateLimit(ip)
    expect(checkRateLimit(ip)).toBe(false)
    vi.advanceTimersByTime(61_000)
    expect(checkRateLimit(ip)).toBe(true)
  })

  it('tracks separate IPs independently', () => {
    const exhausted = '192.168.5.1'
    const fresh = '192.168.5.2'
    for (let i = 0; i < 10; i++) checkRateLimit(exhausted)
    expect(checkRateLimit(exhausted)).toBe(false)
    expect(checkRateLimit(fresh)).toBe(true)
  })
})
