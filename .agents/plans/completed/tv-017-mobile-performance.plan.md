# Plan: TV-017 — Mobile Performance Optimization

## Summary

Four gaps need closing: (1) the local `detectQuality()` in `terrain-viewer.tsx` never returns `'desktop'`, so desktop users get 64×64 terrain instead of the intended 128×128 — this logic is extracted into a proper shared `lib/geometry/deviceQuality.ts` that returns all three quality levels; (2) the Canvas pixel-ratio cap is `[1, 2]` for everyone — on mobile it should be `[1, 1.5]`; (3) when buildings are enabled on mobile, all 200 fetched footprints are rendered — they should be sorted by footprint area (shoelace) and capped at 50; (4) `frameloop="demand"` is already set, so no change needed there.

## User Story

As a developer,
I want the 3D viewer to detect mobile devices and reduce geometry complexity and rendering quality,
So that the viewer runs smoothly on mid-range smartphones without exceeding GPU/memory limits.

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT |
| Complexity | MEDIUM |
| Systems Affected | `lib/geometry/`, `components/terrain-viewer/terrain-viewer.tsx`, `components/terrain-viewer/buildings-mesh.tsx` |
| Jira Issue | TV-017 |

---

## Patterns to Follow

### Lib utility structure
```typescript
// SOURCE: apps/web/lib/webgl/detect-webgl2.ts:1-7
// Pattern: SSR guard first, then browser API call, export single named function
export function detectWebGL2(): boolean {
  if (typeof window === 'undefined') return false
  const canvas = document.createElement('canvas')
  return !!canvas.getContext('webgl2')
}
```

### Test pattern for lib utilities (jsdom environment)
```typescript
// SOURCE: apps/web/lib/webgl/detect-webgl2.test.ts:1-13
import { describe, it, expect } from 'vitest'
import { detectWebGL2 } from './detect-webgl2'
describe('detectWebGL2', () => {
  it('returns false in jsdom (WebGL not supported)', () => {
    expect(detectWebGL2()).toBe(false)
  })
})
// Pattern: import function, call it, assert return value; jsdom globals available
```

### Shoelace polygon area
```typescript
// Shoelace formula for polygon area (used for buildings ranking):
function footprintArea(footprint: [number, number][]): number {
  let area = 0
  const n = footprint.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = footprint[i]
    const [x2, y2] = footprint[(i + 1) % n]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}
// Units are in lng/lat degrees^2 — relative ranking only, not absolute area
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/lib/geometry/deviceQuality.ts` | CREATE | Shared device-quality + mobile detection utility |
| `apps/web/lib/geometry/deviceQuality.test.ts` | CREATE | Unit tests for all three detection cases |
| `apps/web/components/terrain-viewer/terrain-viewer.tsx` | UPDATE | Use shared utility; fix 'desktop' quality; cap DPR on mobile |
| `apps/web/components/terrain-viewer/buildings-mesh.tsx` | UPDATE | Sort+cap buildings by footprint area on mobile |

---

## Tasks

### Task 1: Create deviceQuality.ts

- **File**: `apps/web/lib/geometry/deviceQuality.ts`
- **Action**: CREATE
- **Implement**:

  ```typescript
  import type { TerrainQuality } from '@/types/terrain'

  const MOBILE_BREAKPOINT = 768
  const MOBILE_TOUCH_POINTS = 1  // > 1 to exclude laptop trackpads

  export function detectDeviceQuality(): TerrainQuality {
    if (typeof window === 'undefined') return 'preview'
    if (isMobileDevice()) return 'mobile'
    return 'desktop'
  }

  export function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false
    return (
      window.innerWidth < MOBILE_BREAKPOINT ||
      navigator.maxTouchPoints > MOBILE_TOUCH_POINTS
    )
  }
  ```

  **Notes**:
  - `TerrainQuality` is already defined in `types/terrain.ts` as `'mobile' | 'preview' | 'desktop'`.
  - `preview` is returned as the SSR fallback (same as before) — it avoids requesting 128×128 tiles during SSR where no browser viewport exists.
  - `navigator.maxTouchPoints > 1` (not `> 0`) so that laptop trackpads with a single virtual touch point are classified as desktop.

- **Mirror**: `apps/web/lib/webgl/detect-webgl2.ts` — SSR guard pattern
- **Validate**: `pnpm run build`

---

### Task 2: Unit tests for deviceQuality

- **File**: `apps/web/lib/geometry/deviceQuality.test.ts`
- **Action**: CREATE
- **Implement**:

  ```typescript
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
  ```

- **Mirror**: `apps/web/lib/webgl/detect-webgl2.test.ts:1-13`
- **Validate**: `pnpm test`

---

### Task 3: Update TerrainViewer — use shared utility and fix DPR

- **File**: `apps/web/components/terrain-viewer/terrain-viewer.tsx`
- **Action**: UPDATE
- **Implement** the following changes:

  **3a — Replace import**: Add import from new lib and remove the local `detectQuality` function:
  ```typescript
  import { detectDeviceQuality, isMobileDevice } from '@/lib/geometry/deviceQuality'
  ```
  Delete the local:
  ```typescript
  // DELETE this function:
  function detectQuality(): 'mobile' | 'preview' {
    if (typeof window === 'undefined') return 'preview'
    return window.innerWidth < 768 ? 'mobile' : 'preview'
  }
  ```

  **3b — Use `detectDeviceQuality()` in the terrain fetch effect**: Replace `detectQuality()` with `detectDeviceQuality()`:
  ```typescript
  const quality = detectDeviceQuality()
  ```

  **3c — Cap DPR on mobile**: In `TerrainViewer`, compute DPR once on mount using `useMemo`:
  ```typescript
  const mobileDpr = useMemo<[number, number]>(
    () => (isMobileDevice() ? [1, 1.5] : [1, 2]),
    []
  )
  ```
  Then replace `dpr={[1, 2]}` with `dpr={mobileDpr}`:
  ```tsx
  <Canvas
    dpr={mobileDpr}
    frameloop="demand"
    camera={{ position: [0, 3, 5], fov: 45 }}
  >
  ```

  **Note**: `useMemo` with empty deps is correct here — device type does not change during a session; computing once per mount is intentional.

- **Mirror**: `apps/web/components/terrain-viewer/terrain-viewer.tsx:61-103`
- **Validate**: `pnpm run build`

---

### Task 4: Cap buildings by footprint area on mobile

- **File**: `apps/web/components/terrain-viewer/buildings-mesh.tsx`
- **Action**: UPDATE
- **Implement**:

  **4a — Import** `isMobileDevice`:
  ```typescript
  import { isMobileDevice } from '@/lib/geometry/deviceQuality'
  ```

  **4b — Add constants and helper**:
  ```typescript
  const MOBILE_BUILDINGS_LIMIT = 50

  function footprintArea(footprint: [number, number][]): number {
    let area = 0
    const n = footprint.length
    for (let i = 0; i < n; i++) {
      const [x1, y1] = footprint[i]
      const [x2, y2] = footprint[(i + 1) % n]
      area += x1 * y2 - x2 * y1
    }
    return Math.abs(area) / 2
  }
  ```

  **4c — Add a derived `effectiveBuildings` computation inside `BuildingsMesh`**, before the main `meshData` useMemo:
  ```typescript
  const effectiveBuildings = useMemo(() => {
    if (!isMobileDevice() || buildings.length <= MOBILE_BUILDINGS_LIMIT) return buildings
    return [...buildings]
      .sort((a, b) => footprintArea(b.footprint) - footprintArea(a.footprint))
      .slice(0, MOBILE_BUILDINGS_LIMIT)
  }, [buildings])
  ```

  **4d — Use `effectiveBuildings`** instead of `buildings` in the existing `meshData` useMemo:
  ```typescript
  const meshData = useMemo(() => {
    ...
    return effectiveBuildings.flatMap((building) => {  // ← was `buildings`
    ...
  }, [effectiveBuildings, terrainBounds, terrain, scaleFactor, eleRange, inShape])
  //  ↑ replace `buildings` with `effectiveBuildings` in deps array
  ```

- **Mirror**: `apps/web/components/terrain-viewer/buildings-mesh.tsx:45-85` — existing `useMemo` for geometry
- **Validate**: `pnpm run build`

---

## Validation

```bash
# Type check
pnpm run build

# Lint
pnpm run lint

# Tests
pnpm test
```

---

## Tests

7 new unit tests in `lib/geometry/deviceQuality.test.ts` covering all three detection scenarios for both `isMobileDevice` and `detectDeviceQuality`. `footprintArea` is a pure function used internally in `buildings-mesh.tsx` — it can be exported and tested if desired, but it is not exported in this plan (pure geometry helper, no edge cases beyond what the buildings data guarantees). Existing 87 tests must pass.

---

## Acceptance Criteria

- [ ] `detectDeviceQuality()` returns `'mobile'` for viewport < 768 px, `'desktop'` for wide viewport + no touch (no longer `'preview'`)
- [ ] Desktop terrain fetch uses `quality=desktop` → 128×128 grid (was stuck at 64×64)
- [ ] Mobile Canvas uses `dpr` capped at 1.5 (was 2)
- [ ] Desktop Canvas still uses `dpr` capped at 2
- [ ] On mobile with > 50 buildings, only the 50 largest by footprint area are rendered
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `pnpm test` passes including 7 new `deviceQuality` tests
