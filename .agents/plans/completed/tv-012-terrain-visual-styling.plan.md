# Plan: TV-012 — Terrain Visual Styling — Monochrome & Base

## Summary

Finalize the 3D terrain's visual material system so it reads like a premium 3D-printed model: add `roughness` and `metalness` to all `MeshStandardMaterial` instances, and introduce a `TerrainColorToggle` component on the preview step that lets the customer switch between the three print palette colors (gray / black / white). The toggle is scoped to `terrainColor` only; route and building colors belong to TV-014. The material infrastructure this plan establishes is the dependency TV-014 builds its full color-controls UI on.

## User Story

As a customer,  
I want the terrain to look like a real 3D-printed model with clean, monochrome materials and a visible base,  
So that the preview feels premium and product-accurate rather than like a GIS tool.

## Metadata

| Field | Value |
|---|---|
| Type | NEW_CAPABILITY |
| Complexity | SMALL |
| Systems Affected | `components/terrain-viewer/`, `app/product-configurator/preview/` |
| Jira Issue | TV-012 |
| Blocks | TV-014 |

---

## Patterns to Follow

### Toggle Button UI
```tsx
// SOURCE: apps/web/components/map-viewer/shape-toggle.tsx:1-35
'use client'
import { useConfiguratorStore } from '@/lib/store/configurator'
import type { Shape } from '@/types/configurator'

const LABELS: Record<Shape, string> = { circle: 'Kreis', hexagon: 'Hexagon' }

export function ShapeToggle() {
  const shape = useConfiguratorStore((s) => s.shape)
  const updateConfig = useConfiguratorStore((s) => s.updateConfig)

  return (
    <div className="flex justify-center gap-2">
      {(['circle', 'hexagon'] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => updateConfig('shape', s)}
          className={[
            'rounded px-5 py-2 text-sm font-medium transition-colors',
            shape === s
              ? 'bg-ink text-white'
              : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink',
          ].join(' ')}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  )
}
```

### Step Layout with Controls
```tsx
// SOURCE: apps/web/app/product-configurator/map/page.tsx:1-24
// Pattern: heading → controls (mb-4 per control) → viewer full-width
<div className="py-6">
  <div className="mb-6 text-center">
    <h2>...</h2>
    <p>...</p>
  </div>
  <div className="mb-4">
    <ShapeToggle />    {/* ← control component slot */}
  </div>
  <MapViewer />        {/* ← viewer always last */}
</div>
```

### MeshStandardMaterial Usage
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-mesh.tsx:150-153
<meshStandardMaterial
  color={TERRAIN_COLOR[terrainColor] ?? '#888888'}
  side={THREE.FrontSide}
/>
// Currently missing: roughness, metalness — add to all three material instances
```

### updateConfig Action
```ts
// SOURCE: apps/web/lib/store/configurator.ts:33
updateConfig: (key, value) => set((s) => ({ ...s, [key]: value }))
// Usage: updateConfig('terrainColor', 'black')
```

---

## Files to Change

| File | Action | Purpose |
|---|---|---|
| `apps/web/components/terrain-viewer/terrain-color-toggle.tsx` | CREATE | Three-option color selector for terrainColor |
| `apps/web/components/terrain-viewer/terrain-mesh.tsx` | UPDATE | Add roughness + metalness to all three material instances |
| `apps/web/app/product-configurator/preview/page.tsx` | UPDATE | Add TerrainColorToggle above TerrainViewer |

---

## Tasks

Execute in order. Each task is independently verifiable.

---

### Task 1: Add roughness and metalness to all terrain materials

- **File**: `apps/web/components/terrain-viewer/terrain-mesh.tsx`
- **Action**: UPDATE
- **Implement**:
  - Add `roughness={0.85}` and `metalness={0}` to the **terrain plane** `meshStandardMaterial` (currently lines ~150-153). This approximates the matte surface of FDM/SLA 3D-printed filament.
  - Add the same `roughness={0.85} metalness={0}` to the **sockel** `meshStandardMaterial`.
  - Add `roughness={0.75} metalness={0}` to the **route tube** `meshStandardMaterial`. Slightly less rough to give the route a subtle sheen differentiation from the terrain.
- **Mirror**: `apps/web/components/terrain-viewer/terrain-mesh.tsx:150-153` — existing material; add props inline
- **Validate**: `pnpm run build` — zero TypeScript errors; visually: terrain surface shows clear directional shading without plastic shine

---

### Task 2: Create TerrainColorToggle component

- **File**: `apps/web/components/terrain-viewer/terrain-color-toggle.tsx`
- **Action**: CREATE
- **Implement**:
  - Mirror `apps/web/components/map-viewer/shape-toggle.tsx` exactly — same `'use client'` directive, same button layout, same active/inactive class pattern.
  - Options: `(['gray', 'black', 'white'] as const)` of type `TerrainColor`
  - Label mapping (German, matching the print palette naming):
    ```ts
    const LABELS: Record<TerrainColor, string> = {
      gray: 'Grau',
      black: 'Schwarz',
      white: 'Weiß',
    }
    ```
  - Read `terrainColor` and `updateConfig` from store using **selective selectors** (one `useConfiguratorStore` call per value — mirror shape-toggle.tsx lines 12-13).
  - On click: `updateConfig('terrainColor', value)`.
  - No label above the buttons — the preview page heading provides context.
- **Mirror**: `apps/web/components/map-viewer/shape-toggle.tsx:1-35`
- **Validate**: Component renders without error; clicking a color button updates `terrainColor` in Zustand; terrain and sockel repaint in real time without API re-fetch

---

### Task 3: Wire TerrainColorToggle into the preview step

- **File**: `apps/web/app/product-configurator/preview/page.tsx`
- **Action**: UPDATE
- **Implement**:
  - Follow the map page layout pattern (`apps/web/app/product-configurator/map/page.tsx:1-24`).
  - Wrap the existing `<TerrainViewer />` in a `<div className="py-6">` container (if not already present).
  - Add a `<div className="mb-4">` containing `<TerrainColorToggle />` immediately **above** `<TerrainViewer />`.
  - Existing heading ("3D-Vorschau") and description paragraph stay in place.
  - The page is a **Server Component** — `TerrainColorToggle` carries `'use client'` itself, so no directive needed on the page.
- **Mirror**: `apps/web/app/product-configurator/map/page.tsx:1-24`
- **Validate**: Preview step shows 3 color buttons (Grau / Schwarz / Weiß); clicking each updates terrain + sockel + route tube color immediately; no page reload or API call triggered

---

## Validation

```bash
# From project root
pnpm run build      # zero TypeScript errors

pnpm run lint       # zero lint errors

pnpm run dev        # navigate to /product-configurator/preview
                    # verify color toggle renders and updates in real time
```

Manual checks:
- Terrain surface shows clear shading from the two directional lights (demonstrates roughness working)
- Switching to `'black'` renders `#1a1a1a`; `'white'` renders `#f5f5f5`; `'gray'` renders `#888888`
- Sockel always matches terrain color
- Route tube color is unaffected by terrain color toggle

---

## Acceptance Criteria

- [ ] Default render: terrain + sockel in neutral gray (`#888888`) with matte surface (roughness 0.85)
- [ ] Surface detail visible from all OrbitControls angles — no washed-out patches or hard-shadow clipping
- [ ] TerrainColorToggle renders on preview step with Grau / Schwarz / Weiß options
- [ ] Selecting a color updates terrain + sockel in real time; no API re-fetch occurs
- [ ] `pnpm run build` exits 0 with zero TypeScript errors
- [ ] No grid, axis helpers, or debug overlays in the scene
