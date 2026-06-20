import type { TerrainQuality } from '@/types/terrain'

const MOBILE_BREAKPOINT = 768
const MOBILE_TOUCH_THRESHOLD = 1  // > 1 to exclude laptop trackpads

export function detectDeviceQuality(): TerrainQuality {
  if (typeof window === 'undefined') return 'preview'
  if (isMobileDevice()) return 'mobile'
  return 'desktop'
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.innerWidth < MOBILE_BREAKPOINT ||
    navigator.maxTouchPoints > MOBILE_TOUCH_THRESHOLD
  )
}
