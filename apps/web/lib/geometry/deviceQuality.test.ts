import { describe, it, expect, afterEach } from 'vitest'
import { detectDeviceQuality, isMobileDevice } from './deviceQuality'

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true, configurable: true, value: width,
  })
}

function setMaxTouchPoints(n: number) {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true, configurable: true, value: n,
  })
}

afterEach(() => {
  setInnerWidth(1024)
  setMaxTouchPoints(0)
})

describe('isMobileDevice', () => {
  it('returns true for narrow viewport', () => {
    setInnerWidth(375)
    setMaxTouchPoints(0)
    expect(isMobileDevice()).toBe(true)
  })

  it('returns false for wide viewport with no touch', () => {
    setInnerWidth(1440)
    setMaxTouchPoints(0)
    expect(isMobileDevice()).toBe(false)
  })

  it('returns true when maxTouchPoints > 1 on wide viewport', () => {
    setInnerWidth(1440)
    setMaxTouchPoints(5)
    expect(isMobileDevice()).toBe(true)
  })

  it('returns false when maxTouchPoints is exactly 1 (laptop trackpad)', () => {
    setInnerWidth(1440)
    setMaxTouchPoints(1)
    expect(isMobileDevice()).toBe(false)
  })
})

describe('detectDeviceQuality', () => {
  it('returns mobile for narrow viewport', () => {
    setInnerWidth(375)
    setMaxTouchPoints(0)
    expect(detectDeviceQuality()).toBe('mobile')
  })

  it('returns desktop for wide viewport with no touch', () => {
    setInnerWidth(1440)
    setMaxTouchPoints(0)
    expect(detectDeviceQuality()).toBe('desktop')
  })

  it('returns mobile when touch-capable on wide viewport', () => {
    setInnerWidth(1440)
    setMaxTouchPoints(5)
    expect(detectDeviceQuality()).toBe('mobile')
  })
})
