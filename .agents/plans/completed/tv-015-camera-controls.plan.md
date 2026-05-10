# Plan: TV-015 — Touch & Mouse Camera Controls

## Summary

`OrbitControls` from `@react-three/drei` is already wired into `TerrainViewer` with `enablePan={false}`, `enableDamping`, and `minDistance={2} maxDistance={10}`, satisfying all five acceptance criteria. TV-015 closes the story with two polishing additions: (1) making `dampingFactor={0.05}` explicit so the smoothness parameter is visible and adjustable, and (2) adding `maxPolarAngle={Math.PI / 2 + 0.3}` to prevent the camera from flipping fully underneath the terrain model (a jarring experience on mobile where accidental over-swipes are common). No new files are created; one targeted update to `terrain-viewer.tsx` is the full scope.

## User Story

As a customer,
I want to rotate and zoom the 3D terrain model using both mouse drag/scroll and touch gestures,
So that I can inspect the terrain from any angle on both desktop and mobile.

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT |
| Complexity | LOW |
| Systems Affected | `components/terrain-viewer/terrain-viewer.tsx` |
| Jira Issue | TV-015 |

---

## Patterns to Follow

### Existing OrbitControls setup
```tsx
// SOURCE: apps/web/components/terrain-viewer/terrain-viewer.tsx:49-55
<OrbitControls
  makeDefault
  enablePan={false}
  enableDamping
  minDistance={2}
  maxDistance={10}
/>
// Already in place. Add dampingFactor and maxPolarAngle to this same block.
```

### drei OrbitControls props reference
```tsx
// Standard drei OrbitControls props used in the scene:
// makeDefault    — registers these controls as the default, lets useThree().controls access them
// enablePan      — false prevents lateral dragging (model stays centred on orbit axis)
// enableDamping  — bool shorthand for dampingFactor > 0
// dampingFactor  — float 0-1, lower = longer coast. 0.05 is the library default, explicit is better
// minDistance    — closest camera can get; prevents clipping into mesh
// maxDistance    — farthest camera; keeps model visible
// maxPolarAngle  — radians from top; Math.PI = unrestricted; Math.PI/2+0.3 ≈ 100° prevents flip
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/components/terrain-viewer/terrain-viewer.tsx` | UPDATE | Add `dampingFactor` and `maxPolarAngle` to existing OrbitControls |

---

## Tasks

### Task 1: Add dampingFactor and maxPolarAngle to OrbitControls

- **File**: `apps/web/components/terrain-viewer/terrain-viewer.tsx`
- **Action**: UPDATE
- **Implement**: Extend the existing `<OrbitControls>` block inside `Scene` with two new props:

  ```tsx
  <OrbitControls
    makeDefault
    enablePan={false}
    enableDamping
    dampingFactor={0.05}
    minDistance={2}
    maxDistance={10}
    maxPolarAngle={Math.PI / 2 + 0.3}
  />
  ```

  **Why `maxPolarAngle={Math.PI / 2 + 0.3}`**:
  - `Math.PI / 2` (90°) = camera at the horizon looking straight across
  - `+ 0.3 rad` (≈17°) = allows a slight below-horizon view so the sockel sides are visible
  - Prevents the camera from going fully underneath (which looks broken and is hard to recover from on touch)

  **Why `dampingFactor={0.05}`**:
  - This is drei's default. Making it explicit documents intent and prevents a surprise if the library default changes.
  - 0.05 gives a ~1-second coast — appropriate for a 3D product preview.

- **Mirror**: `apps/web/components/terrain-viewer/terrain-viewer.tsx:49-55` — existing OrbitControls block
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

No new unit tests — `OrbitControls` is a drei/Three.js component with no testable pure logic in this codebase. The existing 79 tests must continue to pass. Interaction behaviour (orbit, zoom, damping) is verified manually in the browser (see Acceptance Criteria).

---

## Acceptance Criteria

- [ ] Click-drag on canvas → model orbits around its centre
- [ ] Scroll on canvas → camera zooms in/out within `[2, 10]` distance range
- [ ] Single-finger touch swipe → model orbits (touch handled by `OrbitControls` automatically)
- [ ] Two-finger pinch → camera zooms
- [ ] Camera cannot drift off-centre (`enablePan={false}`)
- [ ] Camera cannot flip fully below the terrain (`maxPolarAngle` capped at ~100°)
- [ ] Orbit motion coasts smoothly after release (`enableDamping` + `dampingFactor={0.05}`)
- [ ] `pnpm run build` exits 0 with zero TypeScript errors
- [ ] `pnpm test` — 79 tests pass
