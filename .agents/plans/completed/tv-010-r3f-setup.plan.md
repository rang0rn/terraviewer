# Plan: TV-010 Three.js / React Three Fiber Setup

## Summary

Install `three`, `@react-three/fiber`, and `@react-three/drei`, then build a `TerrainViewer` client component that wraps an R3F `<Canvas>` with ambient + directional lighting, `OrbitControls` (pan disabled, damping enabled), and a pixel-ratio cap of 2. WebGL2 support is checked client-side via a pure `detectWebGL2()` utility so the component renders a German fallback message in unsupported browsers. A lightweight placeholder mesh (a cylinder representing the terrain disc position) makes the canvas visually verifiable in TV-010; it will be replaced by the real terrain mesh in TV-011. The preview step page renders `<TerrainViewer />`.

## User Story

As a developer
I want Three.js and React Three Fiber integrated with shared camera controls and a scene wrapper
So that all 3D features have a consistent rendering foundation to build on

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | MEDIUM |
| Systems Affected | `components/terrain-viewer`, `lib/webgl`, `app/product-configurator/preview` |
| Jira Issue | TV-010 |

---

## Patterns to Follow

### Client component with 'use client' and useEffect
```tsx
// SOURCE: apps/web/components/map-viewer/map-viewer.tsx:1-8
'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useConfiguratorStore } from '@/lib/store/configurator'
// → same pattern: 'use client', then react hooks, third-party, lib imports
```

### Null/fallback guard with useState + useEffect for browser-only APIs
```tsx
// SOURCE: apps/web/components/map-viewer/map-viewer.tsx:91-99
if (!routeCoordinates) {
  return (
    <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
      Keine Routendaten vorhanden.
    </div>
  )
}
// → same pattern for WebGL fallback: check → early return with German message
```

### Fixed-height responsive container
```tsx
// SOURCE: apps/web/components/map-viewer/map-viewer.tsx:99
return <div ref={containerRef} className="h-[480px] w-full rounded-xl overflow-hidden" />
// → wrap Canvas in the same class pattern
```

### Pure utility in lib/
```ts
// SOURCE: apps/web/lib/gpx/parser.ts:1-5
import { XMLParser } from 'fast-xml-parser'
export type TrackPoint = { lat: number; lng: number; ele: number | null }
export function parseGpx(gpxText: string): { trackPoints: TrackPoint[] } { ... }
// → same: one exported function per utility file
```

### Vitest test — browser-only utility
```ts
// SOURCE: apps/web/features/map/out-of-bounds.test.ts:1-8
import { describe, it, expect } from 'vitest'
import { isRouteOutOfBounds } from './out-of-bounds'
// → same import style; jsdom provides document.createElement so we can test the false path
```

---

## R3F Scene Design

### Canvas props
| Prop | Value | Reason |
|------|-------|--------|
| `dpr` | `[1, 2]` | Caps pixel ratio at 2 — prevents GPU overload on HiDPI displays |
| `frameloop` | `"demand"` | Renders only on interaction — essential for performance on non-animated scenes |
| `camera` | `{ position: [0, 3, 5], fov: 45 }` | Slight elevation + perspective; consistent default for terrain models |

### OrbitControls props
| Prop | Value | Reason |
|------|-------|--------|
| `enablePan` | `false` | Prevents model drifting off-center |
| `enableDamping` | `true` | Smooth deceleration for desktop + touch |
| `minDistance` | `2` | Model stays in frame on max zoom-in |
| `maxDistance` | `10` | Model stays in frame on max zoom-out |
| `makeDefault` | `true` | Required for `frameloop="demand"` to auto-invalidate on control events |

### Lighting
| Light | Props | Effect |
|-------|-------|--------|
| `<ambientLight>` | `intensity={0.6}` | Soft fill, eliminates pure-black shadows |
| `<directionalLight>` | `position={[5, 10, 5]}`, `intensity={1}`, `castShadow={false}` | Single key light from top-right; no shadow computation overhead |

### Placeholder mesh
A thin grey cylinder (`CylinderGeometry args={[2, 2, 0.15, 64]}`, `MeshStandardMaterial color="#888888"`) lying flat — visually represents the terrain insert disc, confirms WebGL + lighting work. Replaced by real terrain in TV-011.

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/package.json` | UPDATE | Add `three`, `@react-three/fiber`, `@react-three/drei`; `@types/three` as devDep |
| `apps/web/lib/webgl/detect-webgl2.ts` | CREATE | `detectWebGL2()` — browser WebGL2 capability check |
| `apps/web/lib/webgl/detect-webgl2.test.ts` | CREATE | Unit test: jsdom returns false, no-throw guarantee |
| `apps/web/components/terrain-viewer/terrain-viewer.tsx` | CREATE | R3F Canvas wrapper with scene, lights, controls, WebGL fallback |
| `apps/web/app/product-configurator/preview/page.tsx` | UPDATE | Render `<TerrainViewer />` instead of stub |

---

## Risks

| Risk | Mitigation |
|------|------------|
| `three` CommonJS/ESM mismatch in Next.js 14 | Modern Three.js (r160+) ships ESM — should work without `transpilePackages`; add to `next.config.mjs` if build fails |
| R3F peer dep conflict with React 18 | R3F v8 targets React 18 — install latest and verify peer deps |
| Canvas throws on non-WebGL environments (CI/jsdom) | Canvas is only mounted after `detectWebGL2()` returns `true` via `useEffect` — CI never mounts Canvas |
| `frameloop="demand"` + OrbitControls won't re-render | `makeDefault` on OrbitControls registers it with R3F's root; Drei's implementation calls `invalidate()` on each control tick automatically |
| `@types/three` version drift from `three` runtime | Install `@types/three` as devDep at same semver tag as `three` |

---

## Tasks

### Task 1: Install Three.js and R3F packages

- **Action**: Run from `apps/web/`:
  ```bash
  pnpm add three @react-three/fiber @react-three/drei
  pnpm add -D @types/three
  ```
- **Validate**: `pnpm run build` — confirm no peer-dep conflicts

### Task 2: Create WebGL2 detection utility

- **File**: `apps/web/lib/webgl/detect-webgl2.ts`
- **Action**: CREATE
- **Implement**:
  ```ts
  export function detectWebGL2(): boolean {
    try {
      const canvas = document.createElement('canvas')
      return !!canvas.getContext('webgl2')
    } catch {
      return false
    }
  }
  ```
- **Mirror**: `apps/web/lib/gpx/parser.ts:1-5` — single named export, no side effects
- **Validate**: `pnpm run build`

### Task 3: Unit test for WebGL2 detection utility

- **File**: `apps/web/lib/webgl/detect-webgl2.test.ts`
- **Action**: CREATE
- **Implement**:
  ```ts
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
  ```
- **Mirror**: `apps/web/features/map/out-of-bounds.test.ts:1-10`
- **Validate**: `pnpm test`

### Task 4: Create TerrainViewer component

- **File**: `apps/web/components/terrain-viewer/terrain-viewer.tsx`
- **Action**: CREATE
- **Implement**:
  ```tsx
  'use client'

  import { useEffect, useState } from 'react'
  import { Canvas } from '@react-three/fiber'
  import { OrbitControls } from '@react-three/drei'
  import { detectWebGL2 } from '@/lib/webgl/detect-webgl2'

  function Scene() {
    return (
      <>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow={false} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          minDistance={2}
          maxDistance={10}
        />
        {/* placeholder disc — replaced by terrain mesh in TV-011 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2, 2, 0.15, 64]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      </>
    )
  }

  export function TerrainViewer() {
    const [webglSupported, setWebglSupported] = useState<boolean | null>(null)

    useEffect(() => {
      setWebglSupported(detectWebGL2())
    }, [])

    if (webglSupported === null) {
      return <div className="h-[480px] w-full rounded-xl bg-ink/5 animate-pulse" />
    }

    if (!webglSupported) {
      return (
        <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
          Dein Browser unterstützt WebGL nicht. Bitte versuche einen anderen Browser.
        </div>
      )
    }

    return (
      <div className="h-[480px] w-full rounded-xl overflow-hidden">
        <Canvas
          dpr={[1, 2]}
          frameloop="demand"
          camera={{ position: [0, 3, 5], fov: 45 }}
        >
          <Scene />
        </Canvas>
      </div>
    )
  }
  ```
- **Mirror**: `apps/web/components/map-viewer/map-viewer.tsx:1-100` — `'use client'`, `useEffect`, fixed-height container, German fallback message
- **Validate**: `pnpm run build`

### Task 5: Update preview step page

- **File**: `apps/web/app/product-configurator/preview/page.tsx`
- **Action**: UPDATE
- **Implement**:
  ```tsx
  import { TerrainViewer } from '@/components/terrain-viewer/terrain-viewer'

  export default function PreviewStep() {
    return (
      <div className="py-6">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-ink">3D-Vorschau</h2>
          <p className="mt-1 text-sm text-ink/60">
            Rotiere das Modell mit der Maus oder per Touch-Geste.
          </p>
        </div>
        <TerrainViewer />
      </div>
    )
  }
  ```
- **Mirror**: `apps/web/app/product-configurator/map/page.tsx:1-20` — same heading + description + component pattern
- **Validate**: `pnpm run build`

---

## Validation

```bash
# Type check + build
pnpm run build

# Lint
pnpm run lint

# Tests (expect 2 new webgl cases; all 46 prior pass)
pnpm test
```

---

## Acceptance Criteria

- [ ] `three`, `@react-three/fiber`, `@react-three/drei` present in `package.json`
- [ ] 3D Preview step renders a `<canvas>` element in a WebGL-capable browser
- [ ] Placeholder grey cylinder disc visible and lit correctly
- [ ] Orbit controls respond to mouse drag (rotate) and scroll (zoom)
- [ ] Pan is disabled (model stays centred)
- [ ] Pixel ratio capped at 2 via `dpr={[1, 2]}`
- [ ] German fallback message shown in non-WebGL browsers
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` exits 0 (2 new webgl cases; all 46 prior pass)
