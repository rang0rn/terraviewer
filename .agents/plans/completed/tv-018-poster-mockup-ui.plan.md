# Plan: TV-018 — Poster Mockup UI

## Summary

Build a CSS-based poster mockup that replaces the current placeholder at the mockup step. The mockup shows a portrait-oriented poster card (white background, frame border, shadow) with a terrain insert in the upper portion — a square div clipped to the selected circle or hexagon shape, filled with `terrainColor`, and overlaid with a representative SVG route stroke in `routeColor`. Below the insert, the poster text area shows the current `posterText` store values (all empty at this point; TV-019 adds the input form). Two files change: a new `PosterMockup` component and the updated mockup page.

## User Story

As a customer,
I want to see a realistic poster mockup showing my terrain insert centered in a framed poster layout,
So that I have a clear sense of what the physical product will look like before I place my order.

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | MEDIUM |
| Systems Affected | `components/poster-mockup/`, `app/product-configurator/mockup/` |
| Jira Issue | TV-018 |

---

## Patterns to Follow

### Page layout pattern
```tsx
// SOURCE: apps/web/app/product-configurator/preview/page.tsx:1-23
// Pattern: py-6 wrapper → mb-6 centered title → mb-4 controls → viewer component
export default function PreviewStep() {
  return (
    <div className="py-6">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-ink">3D-Vorschau</h2>
        <p className="mt-1 text-sm text-ink/60">Rotiere das Modell...</p>
      </div>
      {/* controls */}
      <TerrainViewer />
    </div>
  )
}
```

### Shape clip-path constants (established in TV-016)
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-viewer.tsx:148-152
// circle → borderRadius: '50%' on aspect-square div
// hexagon → clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
```

### Color hex maps (from terrain-mesh)
```typescript
// SOURCE: apps/web/components/terrain-viewer/terrain-mesh.tsx:15-29
const TERRAIN_COLOR = { gray: '#888888', black: '#1a1a1a', white: '#f5f5f5' }
const ROUTE_COLOR   = { orange: '#ff6b35', green: '#4caf50', blue: '#2196f3',
                         red: '#f44336', white: '#ffffff', yellow: '#ffeb3b', black: '#1a1a1a' }
```

### Store selector pattern
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-color-toggle.tsx:13-14
const terrainColor = useConfiguratorStore((s) => s.terrainColor)
const { updateConfig } = useConfiguratorStore()
// Pattern: individual selectors for reactive values
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/components/poster-mockup/poster-mockup.tsx` | CREATE | CSS poster card with shape insert + text display |
| `apps/web/app/product-configurator/mockup/page.tsx` | UPDATE | Replace placeholder with real mockup page |

---

## Tasks

### Task 1: Create PosterMockup component

- **File**: `apps/web/components/poster-mockup/poster-mockup.tsx`
- **Action**: CREATE
- **Implement**:

  ```tsx
  'use client'

  import { useConfiguratorStore } from '@/lib/store/configurator'
  import type { RouteColor, TerrainColor } from '@/types/configurator'

  const TERRAIN_HEX: Record<TerrainColor, string> = {
    gray: '#888888',
    black: '#1a1a1a',
    white: '#f5f5f5',
  }

  const ROUTE_HEX: Record<RouteColor, string> = {
    orange: '#ff6b35',
    green: '#4caf50',
    blue: '#2196f3',
    red: '#f44336',
    white: '#ffffff',
    yellow: '#ffeb3b',
    black: '#1a1a1a',
  }

  const HEXAGON_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'

  export function PosterMockup() {
    const terrainColor = useConfiguratorStore((s) => s.terrainColor)
    const routeColor = useConfiguratorStore((s) => s.routeColor)
    const shape = useConfiguratorStore((s) => s.shape)
    const posterText = useConfiguratorStore((s) => s.posterText)

    const terrainHex = TERRAIN_HEX[terrainColor]
    const routeHex = ROUTE_HEX[routeColor]
    const isCircle = shape === 'circle'

    const distanceElevation = [posterText.distance, posterText.elevation]
      .filter(Boolean)
      .join(' · ')
    const dateTime = [posterText.date, posterText.time]
      .filter(Boolean)
      .join(' · ')

    return (
      <div className="flex justify-center px-4">
        {/* Poster card: frame border + white mat + shadow */}
        <div className="w-full max-w-xs border-[6px] border-ink/80 bg-white shadow-2xl">
          <div className="px-6 pt-6 pb-8">

            {/* Terrain insert — square, clipped to shape */}
            <div className="mx-auto aspect-square w-full overflow-hidden relative"
              style={{
                backgroundColor: terrainHex,
                borderRadius: isCircle ? '50%' : undefined,
                clipPath: isCircle ? undefined : HEXAGON_CLIP,
              }}
            >
              {/* Representative route overlay */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <polyline
                  points="15,85 25,65 32,72 50,35 62,55 70,42 85,18"
                  stroke={routeHex}
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              </svg>
            </div>

            {/* Text area — below insert */}
            <div className="mt-6 text-center">
              <p className="text-base font-semibold leading-tight text-ink">
                {posterText.name || ' '}
              </p>
              {posterText.event && (
                <p className="mt-1 text-sm text-ink/70">{posterText.event}</p>
              )}
              {dateTime && (
                <p className="mt-1 text-xs text-ink/60">{dateTime}</p>
              )}
              {distanceElevation && (
                <p className="mt-1 text-xs text-ink/60">{distanceElevation}</p>
              )}
              {posterText.extra && (
                <p className="mt-1 text-xs text-ink/50">{posterText.extra}</p>
              )}
            </div>

          </div>
        </div>
      </div>
    )
  }
  ```

  **Design decisions**:
  - `border-[6px] border-ink/80`: thick dark border simulates a physical frame
  - `max-w-xs` (320 px): fits comfortably on 375 px mobile viewport with padding
  - `aspect-square w-full` on insert: the terrain shape fills the full card width to look prominent; shape is the only form, not a literal 12 cm measurement
  - `overflow-hidden` on the insert div prevents SVG from bleeding outside the shape boundary (the clip-path and border-radius handle the actual mask, but overflow-hidden catches any sub-pixel bleed)
  - `aria-hidden="true"` on the decorative SVG
  - `' '` (non-breaking space) for name placeholder keeps the text area height stable when name is empty
  - Text fields only render when populated (except name which always reserves height); TV-019 adds the form inputs that populate `posterText`

- **Mirror**: `apps/web/components/terrain-viewer/terrain-color-toggle.tsx:1-35` — store selector pattern; `apps/web/components/terrain-viewer/terrain-viewer.tsx:148-155` — shape clip-path pattern
- **Validate**: `pnpm run build`

---

### Task 2: Update mockup page

- **File**: `apps/web/app/product-configurator/mockup/page.tsx`
- **Action**: UPDATE
- **Implement**: Replace the placeholder stub with the real page layout:

  ```tsx
  import { PosterMockup } from '@/components/poster-mockup/poster-mockup'

  export default function MockupStep() {
    return (
      <div className="py-6">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-ink">Poster-Vorschau</h2>
          <p className="mt-1 text-sm text-ink/60">
            So wird dein Poster aussehen.
          </p>
        </div>
        <PosterMockup />
      </div>
    )
  }
  ```

- **Mirror**: `apps/web/app/product-configurator/preview/page.tsx:1-23`
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

No new unit tests — `PosterMockup` is a pure UI/store-binding component with no testable pure logic, consistent with TV-012/TV-014 precedent. Existing 94 tests must pass.

---

## Acceptance Criteria

- [ ] Mockup step shows a poster card with a thick frame border, white background, and drop shadow
- [ ] Terrain insert is square, centered in the upper portion, and clipped to a circle when `shape === 'circle'` or flat-top hexagon when `shape === 'hexagon'`
- [ ] Terrain insert background matches `terrainColor` from Zustand in real time (Grau = #888888, Schwarz = #1a1a1a, Weiß = #f5f5f5)
- [ ] Route stroke inside the insert matches `routeColor` from Zustand in real time
- [ ] Text area below insert is visible; when `posterText` fields are empty, layout remains stable (name row always visible)
- [ ] At 375 px viewport width, the full poster card is visible without horizontal scrolling
- [ ] At 1280 px viewport width, the card is centered and does not span the full width
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `pnpm test` — 94 tests pass (no regressions)
