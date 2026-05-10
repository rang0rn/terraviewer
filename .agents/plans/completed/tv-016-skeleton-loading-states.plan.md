# Plan: TV-016 — Skeleton Preview & Loading States

## Summary

Three improvements close this story: (1) the terrain loading skeleton is currently a plain pulsing rectangle — it should be shape-aware, showing a circle or hexagon (whichever is selected in Zustand) inside a neutral canvas-area placeholder; (2) when terrain data arrives and the `<Canvas>` mounts, it should fade in with a 200 ms CSS opacity transition rather than snapping in; (3) `canAdvance()` currently returns `true` unconditionally for the preview step, but the acceptance criteria require the "Next" button to be disabled while the terrain fetch is in flight — a `isTerrainLoading` flag is added to the store and `canAdvance` is extended to gate the preview step. The upload step is already gated (`gpxUrl !== null`) and the upload spinner already exists, so no upload changes are needed.

## User Story

As a customer,
I want to see a polished loading skeleton while terrain data is being fetched,
So that the app feels fast and premium rather than broken during network requests.

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT |
| Complexity | LOW |
| Systems Affected | `lib/store/configurator.ts`, `components/terrain-viewer/terrain-viewer.tsx` |
| Jira Issue | TV-016 |

---

## Patterns to Follow

### Store action pattern
```typescript
// SOURCE: apps/web/lib/store/configurator.ts:21-56
// ConfiguratorStore extends ConfiguratorState with extra fields (currentStep, actions).
// isTerrainLoading follows the same pattern: extra store-only field + action.
// It is NOT added to ConfiguratorState because it is transient, not configuration.
type ConfiguratorStore = ConfiguratorState & {
  currentStep: StepId
  isTerrainLoading: boolean          // ← add here
  updateConfig: ...
  setTerrainLoading: (v: boolean) => void  // ← add action
  canAdvance: () => boolean
}
// In create():
isTerrainLoading: false,
setTerrainLoading: (v) => set({ isTerrainLoading: v }),
// Updated canAdvance:
canAdvance: () => {
  const { currentStep, gpxUrl, isTerrainLoading } = get()
  if (currentStep === 'upload') return gpxUrl !== null
  if (currentStep === 'preview') return !isTerrainLoading
  return true
},
```

### Existing loading skeleton
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-viewer.tsx:132-133
// Replace this with the shape-aware version:
if (webglSupported === null || (routeBounds && !terrain && !error)) {
  return <div className="h-[480px] w-full rounded-xl bg-ink/5 animate-pulse" />
}
```

### Opacity transition for canvas mount
```tsx
// CSS opacity fade-in pattern: render with opacity-0, transition to opacity-100 on mount.
// Use a useState + useEffect to trigger after terrain is set.
const [canvasVisible, setCanvasVisible] = useState(false)
useEffect(() => { if (terrain) setCanvasVisible(true) }, [terrain])
// className: `transition-opacity duration-200 ${canvasVisible ? 'opacity-100' : 'opacity-0'}`
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/lib/store/configurator.ts` | UPDATE | Add `isTerrainLoading` field + `setTerrainLoading` action + preview gate in `canAdvance` |
| `apps/web/components/terrain-viewer/terrain-viewer.tsx` | UPDATE | Shape-aware skeleton; fade-in transition; call `setTerrainLoading` at fetch start/end |

---

## Tasks

### Task 1: Extend store with isTerrainLoading + update canAdvance

- **File**: `apps/web/lib/store/configurator.ts`
- **Action**: UPDATE
- **Implement**:

  1. Add `isTerrainLoading: boolean` and `setTerrainLoading` to the `ConfiguratorStore` type (after `canAdvance`):
     ```typescript
     type ConfiguratorStore = ConfiguratorState & {
       currentStep: StepId
       isTerrainLoading: boolean
       updateConfig: <K extends keyof ConfiguratorState>(key: K, value: ConfiguratorState[K]) => void
       advanceStep: () => void
       retreatStep: () => void
       canAdvance: () => boolean
       setTerrainLoading: (v: boolean) => void
     }
     ```

  2. In `create()`, initialise the field and add the action:
     ```typescript
     isTerrainLoading: false,
     setTerrainLoading: (v) => set({ isTerrainLoading: v }),
     ```

  3. Update `canAdvance` to gate the preview step:
     ```typescript
     canAdvance: () => {
       const { currentStep, gpxUrl, isTerrainLoading } = get()
       if (currentStep === 'upload') return gpxUrl !== null
       if (currentStep === 'preview') return !isTerrainLoading
       return true
     },
     ```

- **Mirror**: `apps/web/lib/store/configurator.ts:21-56`
- **Validate**: `pnpm run build`

---

### Task 2: Shape-aware skeleton + fade-in in TerrainViewer

- **File**: `apps/web/components/terrain-viewer/terrain-viewer.tsx`
- **Action**: UPDATE
- **Implement**:

  **2a — Import and call setTerrainLoading:**
  - Destructure `setTerrainLoading` from the store:
    ```typescript
    const { setTerrainLoading } = useConfiguratorStore()
    ```
  - In the terrain fetch `useEffect`, bracket the fetch with loading state:
    ```typescript
    setTerrainLoading(true)
    fetch(`/api/terrain/data?${params}`)
      .then(...)
      .then((data) => {
        if (data.success) {
          setTerrain(data.terrain)
          setTerrainBounds(padded)
        } else {
          setError('Geländedaten konnten nicht geladen werden.')
        }
      })
      .catch(() => {
        setError('Geländedaten konnten nicht geladen werden.')
      })
      .finally(() => setTerrainLoading(false))
    ```
  - Also reset on `routeBounds` change: add `setTerrainLoading(false)` in the routeBounds reset effect (or let `.finally` handle it — `.finally` is sufficient since the fetch is re-triggered anyway).

  **2b — Read `shape` from store for skeleton:**
  - Add to the store selectors in `TerrainViewer`:
    ```typescript
    const shape = useConfiguratorStore((s) => s.shape)
    ```

  **2c — Shape-aware skeleton:**

  Replace the existing loading state return:
  ```tsx
  // OLD:
  return <div className="h-[480px] w-full rounded-xl bg-ink/5 animate-pulse" />

  // NEW:
  return (
    <div className="h-[480px] w-full rounded-xl bg-ink/5 flex items-center justify-center">
      <div
        className="w-3/4 aspect-square max-w-xs bg-ink/10 animate-pulse"
        style={
          shape === 'hexagon'
            ? { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }
            : { borderRadius: '50%' }
        }
      />
    </div>
  )
  ```

  **Notes on geometry**:
  - Circle: `borderRadius: '50%'` on a square (`aspect-square`) element = true circle
  - Hexagon: `polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)` is a flat-top regular hexagon matching the terrain model's orientation (horizontal top and bottom edges)
  - `w-3/4 aspect-square max-w-xs`: responsive width (75% of container), square ratio, capped at 320 px on large screens

  **2d — Fade-in transition for Canvas:**

  Add a `canvasVisible` state and set it after terrain loads:
  ```typescript
  const [canvasVisible, setCanvasVisible] = useState(false)
  
  useEffect(() => {
    if (terrain) setCanvasVisible(true)
  }, [terrain])
  ```

  Wrap the Canvas div with the transition classes:
  ```tsx
  <div className={`h-[480px] w-full rounded-xl overflow-hidden transition-opacity duration-200 ${canvasVisible ? 'opacity-100' : 'opacity-0'}`}>
    <Canvas ...>
  ```

- **Mirror**: `apps/web/components/terrain-viewer/terrain-viewer.tsx:61-103`
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

The store's `canAdvance` logic now has three cases. Add tests for the new preview-step gate:

- **File**: `apps/web/lib/store/configurator.test.ts` (CREATE if it doesn't exist, or UPDATE)
- **Test cases**:
  1. `canAdvance()` returns `false` on preview step when `isTerrainLoading = true`
  2. `canAdvance()` returns `true` on preview step when `isTerrainLoading = false`
  3. `canAdvance()` still returns `false` on upload step when `gpxUrl = null` (regression)
  4. `canAdvance()` still returns `true` on upload step when `gpxUrl` is set (regression)

Pattern to follow:
```typescript
// Mirror: apps/web/app/api/terrain/data/route.test.ts:1-20
import { describe, it, expect, beforeEach } from 'vitest'

describe('configurator store canAdvance', () => {
  // Create a fresh store instance or use the singleton + reset between tests
})
```

**Note**: Zustand stores are singletons. Either reset state between tests or test the pure `canAdvance` logic by calling `useConfiguratorStore.setState(...)` before each assertion.

---

## Acceptance Criteria

- [ ] Loading skeleton is a circle when `shape === 'circle'` and a hexagon when `shape === 'hexagon'`, centered in the canvas area with an outer neutral rectangle
- [ ] Skeleton pulses with `animate-pulse`
- [ ] When terrain data arrives, the Canvas fades in over 200 ms instead of snapping in
- [ ] "Next" button is disabled (`canAdvance() === false`) while terrain is fetching in the preview step
- [ ] "Next" button re-enables once terrain fetch completes (success or error)
- [ ] Upload step "Next" remains gated by `gpxUrl !== null` (no regression)
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `pnpm test` passes (including new `canAdvance` store tests)
