# Plan: TV-014 — Color Palette & Elevation Scale Controls

## Summary

Add the three missing UI controls to the 3D Preview step: a `RouteColorToggle` (7 color swatches), a `BuildingColorToggle` (3 text buttons mirroring `TerrainColorToggle`), and an `ElevationScaleToggle` (1× / 2× / 3× text buttons). All three store fields (`routeColor`, `buildingColor`, `elevationScale`) already exist in the Zustand store and are already consumed reactively by `terrain-mesh.tsx` and `buildings-mesh.tsx` — only the UI controls are missing. No store changes, no mesh changes, no API changes.

## User Story

As a customer,
I want to select colors for the route, terrain, and buildings, and adjust the elevation exaggeration from 1× to 3×,
So that I can tailor the visual style to my preferences and see changes immediately.

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | LOW |
| Systems Affected | `components/terrain-viewer/`, `app/product-configurator/preview/` |
| Jira Issue | TV-014 |

---

## Patterns to Follow

### Button toggle (text labels)
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-color-toggle.tsx:1-35
'use client'
import { useConfiguratorStore } from '@/lib/store/configurator'
import type { TerrainColor } from '@/types/configurator'

const LABELS: Record<TerrainColor, string> = { gray: 'Grau', black: 'Schwarz', white: 'Weiß' }

export function TerrainColorToggle() {
  const terrainColor = useConfiguratorStore((s) => s.terrainColor)
  const { updateConfig } = useConfiguratorStore()
  return (
    <div className="flex justify-center gap-2">
      {(['gray', 'black', 'white'] as const).map((c) => (
        <button key={c} type="button" onClick={() => updateConfig('terrainColor', c)}
          className={[
            'rounded px-5 py-2 text-sm font-medium transition-colors',
            terrainColor === c ? 'bg-ink text-white' : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink',
          ].join(' ')}>
          {LABELS[c]}
        </button>
      ))}
    </div>
  )
}
// Pattern: selector from store + updateConfig; `as const` for literal type safety
```

### Color swatch (visual circles)
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-mesh.tsx:21-29
// ROUTE_COLOR hex values to use as swatch backgrounds:
const ROUTE_COLOR: Record<RouteColor, string> = {
  orange: '#ff6b35',
  green:  '#4caf50',
  blue:   '#2196f3',
  red:    '#f44336',
  white:  '#ffffff',
  yellow: '#ffeb3b',
  black:  '#1a1a1a',
}
// Pattern: swatches use background color from hex map;
// selected state: ring-2 ring-offset-1 ring-ink (Tailwind ring utility)
// unselected: ring-1 ring-ink/20
// size: w-8 h-8 rounded-full
```

### Store hook pattern
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-color-toggle.tsx:13-14
const terrainColor = useConfiguratorStore((s) => s.terrainColor)
const { updateConfig } = useConfiguratorStore()
// Pattern: selective selector for reading, destructured store for writing
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/components/terrain-viewer/route-color-toggle.tsx` | CREATE | Color swatches for routeColor (7 options) |
| `apps/web/components/terrain-viewer/building-color-toggle.tsx` | CREATE | Text buttons for buildingColor (3 options, mirrors TerrainColorToggle) |
| `apps/web/components/terrain-viewer/elevation-scale-toggle.tsx` | CREATE | Text buttons for elevationScale (1× / 2× / 3×) |
| `apps/web/app/product-configurator/preview/page.tsx` | UPDATE | Add all three new controls in their own `mb-4` divs |

---

## Tasks

### Task 1: Create RouteColorToggle

- **File**: `apps/web/components/terrain-viewer/route-color-toggle.tsx`
- **Action**: CREATE
- **Implement**:

  ```tsx
  'use client'

  import { useConfiguratorStore } from '@/lib/store/configurator'
  import type { RouteColor } from '@/types/configurator'

  const ROUTE_HEX: Record<RouteColor, string> = {
    orange: '#ff6b35',
    green:  '#4caf50',
    blue:   '#2196f3',
    red:    '#f44336',
    white:  '#ffffff',
    yellow: '#ffeb3b',
    black:  '#1a1a1a',
  }

  const COLORS: RouteColor[] = ['orange', 'green', 'blue', 'red', 'white', 'yellow', 'black']

  export function RouteColorToggle() {
    const routeColor = useConfiguratorStore((s) => s.routeColor)
    const { updateConfig } = useConfiguratorStore()

    return (
      <div className="flex justify-center gap-3">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => updateConfig('routeColor', c)}
            style={{ backgroundColor: ROUTE_HEX[c] }}
            className={[
              'h-8 w-8 rounded-full transition-all',
              c === 'white' ? 'border border-ink/20' : '',
              routeColor === c
                ? 'ring-2 ring-ink ring-offset-1'
                : 'ring-1 ring-ink/10 hover:ring-ink/30',
            ].join(' ')}
          />
        ))}
      </div>
    )
  }
  ```

  **Notes**:
  - `white` swatch gets a border so it's visible against a light background.
  - Swatches use Tailwind `ring` utilities for the selected state — no extra DOM elements.
  - `aria-label={c}` provides accessibility; the color name in English is sufficient for screen readers.

- **Mirror**: `apps/web/components/terrain-viewer/terrain-color-toggle.tsx:1-35`
- **Validate**: `pnpm run build`

---

### Task 2: Create BuildingColorToggle

- **File**: `apps/web/components/terrain-viewer/building-color-toggle.tsx`
- **Action**: CREATE
- **Implement**: Exact mirror of `TerrainColorToggle`, reading `buildingColor` and calling `updateConfig('buildingColor', c)`:

  ```tsx
  'use client'

  import { useConfiguratorStore } from '@/lib/store/configurator'
  import type { TerrainColor } from '@/types/configurator'

  const LABELS: Record<TerrainColor, string> = {
    gray: 'Grau',
    black: 'Schwarz',
    white: 'Weiß',
  }

  export function BuildingColorToggle() {
    const buildingColor = useConfiguratorStore((s) => s.buildingColor)
    const { updateConfig } = useConfiguratorStore()

    return (
      <div className="flex justify-center gap-2">
        {(['gray', 'black', 'white'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateConfig('buildingColor', c)}
            className={[
              'rounded px-5 py-2 text-sm font-medium transition-colors',
              buildingColor === c
                ? 'bg-ink text-white'
                : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink',
            ].join(' ')}
          >
            {LABELS[c]}
          </button>
        ))}
      </div>
    )
  }
  ```

- **Mirror**: `apps/web/components/terrain-viewer/terrain-color-toggle.tsx:1-35`
- **Validate**: `pnpm run build`

---

### Task 3: Create ElevationScaleToggle

- **File**: `apps/web/components/terrain-viewer/elevation-scale-toggle.tsx`
- **Action**: CREATE
- **Implement**:

  ```tsx
  'use client'

  import { useConfiguratorStore } from '@/lib/store/configurator'
  import type { ElevationScale } from '@/types/configurator'

  const STEPS: ElevationScale[] = [1, 2, 3]

  export function ElevationScaleToggle() {
    const elevationScale = useConfiguratorStore((s) => s.elevationScale)
    const { updateConfig } = useConfiguratorStore()

    return (
      <div className="flex justify-center gap-2">
        {STEPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateConfig('elevationScale', s)}
            className={[
              'rounded px-5 py-2 text-sm font-medium transition-colors',
              elevationScale === s
                ? 'bg-ink text-white'
                : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink',
            ].join(' ')}
          >
            {s}×
          </button>
        ))}
      </div>
    )
  }
  ```

- **Mirror**: `apps/web/components/terrain-viewer/terrain-color-toggle.tsx:1-35`
- **Validate**: `pnpm run build`

---

### Task 4: Wire all three controls into the preview step

- **File**: `apps/web/app/product-configurator/preview/page.tsx`
- **Action**: UPDATE
- **Implement**: Add imports and render each new toggle in its own `mb-4` div. Final order: RouteColorToggle → TerrainColorToggle → BuildingColorToggle → ElevationScaleToggle → BuildingsToggle → TerrainViewer.

  ```tsx
  import { TerrainViewer } from '@/components/terrain-viewer/terrain-viewer'
  import { TerrainColorToggle } from '@/components/terrain-viewer/terrain-color-toggle'
  import { BuildingsToggle } from '@/components/terrain-viewer/buildings-toggle'
  import { RouteColorToggle } from '@/components/terrain-viewer/route-color-toggle'
  import { BuildingColorToggle } from '@/components/terrain-viewer/building-color-toggle'
  import { ElevationScaleToggle } from '@/components/terrain-viewer/elevation-scale-toggle'

  export default function PreviewStep() {
    return (
      <div className="py-6">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-ink">3D-Vorschau</h2>
          <p className="mt-1 text-sm text-ink/60">
            Rotiere das Modell mit der Maus oder per Touch-Geste.
          </p>
        </div>
        <div className="mb-4">
          <RouteColorToggle />
        </div>
        <div className="mb-4">
          <TerrainColorToggle />
        </div>
        <div className="mb-4">
          <BuildingColorToggle />
        </div>
        <div className="mb-4">
          <ElevationScaleToggle />
        </div>
        <div className="mb-4">
          <BuildingsToggle />
        </div>
        <TerrainViewer />
      </div>
    )
  }
  ```

- **Mirror**: `apps/web/app/product-configurator/map/page.tsx` — each control in its own `mb-4` div
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

No new unit tests — all four components are pure UI/store-binding with no testable pure logic (identical reasoning to TV-012 `TerrainColorToggle`). Existing 79 tests must continue to pass.

---

## Acceptance Criteria

- [ ] `RouteColorToggle` renders 7 colored circular swatches; clicking any swatch updates `routeColor` in the store and the route tube color changes immediately in the 3D scene
- [ ] `BuildingColorToggle` renders Grau / Schwarz / Weiß text buttons; clicking updates `buildingColor` and building material color changes immediately
- [ ] `ElevationScaleToggle` renders 1× / 2× / 3× text buttons; clicking updates `elevationScale` and terrain height scaling changes immediately in the scene
- [ ] White route swatch has a visible border so it is distinguishable on a light background
- [ ] Type check passes with zero errors (`pnpm run build`)
- [ ] Lint passes (`pnpm run lint`)
- [ ] Existing 79 tests continue to pass (`pnpm test`)
