# User Stories — Terrain Poster Configurator

**Generated from:** `.agents/PRD/PRD.md`  
**Product:** Terrain Poster Configurator  
**Total Stories:** 23  
**Implementation Phases:** 4  

---

## Coverage Map

| PRD Section | Stories |
|---|---|
| Story 1: GPX Upload | TV-002, TV-003, TV-004, TV-005 |
| Story 2: 2D Route prüfen | TV-007 |
| Story 3: Ausschnittsform wählen | TV-008 |
| Story 4: Out-of-bounds Warnung | TV-009 |
| Story 5: 3D Terrain ansehen | TV-011, TV-015, TV-016 |
| Story 6: Gebäude anzeigen | TV-013 |
| Story 7: Farben & Höhenüberhöhung | TV-014 |
| Story 8: Poster-Mockup | TV-018, TV-019 |
| Story 9: Bestellung & GPX-Referenz | TV-020, TV-021 |
| Architecture / Technical | TV-001, TV-010, TV-012, TV-017, TV-022, TV-023 |

---

---

# Phase 1: Foundation & GPX Upload

---

## TV-001 Project Setup & Stepper Flow

**Type**: Technical  
**Jira Type**: Task  
**Priority**: High  
**Complexity**: Medium  
**Phase**: Phase 1  
**Labels**: `frontend`, `infrastructure`, `setup`

### Description
As a developer, I want a working Next.js project with a step-based configurator shell, so that all subsequent feature teams have a consistent, navigable foundation to build on.

### Acceptance Criteria
- [ ] Given a fresh clone, when running `npm install && npm run dev`, then the app starts without errors
- [ ] Given the app is running, when navigating to the configurator route, then a 5-step progress indicator (`Upload → 2D Map → 3D Preview → Poster Mockup → Cart`) is visible
- [ ] Given any step, when moving forward or backward, then the active step indicator updates correctly and previously completed step data is retained in Zustand store
- [ ] Given the `ConfiguratorState` type (`gpxUrl`, `shape`, `elevationScale`, `buildingsEnabled`, `routeColor`, `terrainColor`, `buildingColor`, `posterText`), when any value changes, then all viewer components reactively update
- [ ] Given the project runs, when inspecting the build output, then TypeScript strict mode passes with zero errors

### Technical Notes
- Use Next.js 14+ App Router with a dedicated `/product-configurator` route
- Central state in Zustand; shape matches `ConfiguratorState` type from `apps/web/types/configurator.ts`
- Tailwind CSS 3+ for all styling; no CSS modules
- Directory structure per PRD Section 6: `components/`, `features/`, `lib/`, `types/`
- Stepper is a shared layout component, not duplicated per step

### Dependencies
- Blocked by: —
- Blocks: TV-002, TV-007, TV-010, TV-018

---

## TV-002 GPX Upload UI

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 1  
**Labels**: `frontend`, `upload`, `ui`

### Description
As a customer, I want to upload a `.gpx` file through a clear drag-and-drop or file-picker interface, so that my personal route becomes the basis for the terrain poster.

### Acceptance Criteria
- [ ] Given the Upload step, when the page loads, then a drag-and-drop zone and a "Browse file" button are visible
- [ ] Given a user drags a non-`.gpx` file, when it is dropped, then an inline error message explains only `.gpx` files are accepted
- [ ] Given a valid `.gpx` file is selected, when the upload begins, then a progress indicator or loading state replaces the drop zone
- [ ] Given a successful upload, when the API returns `gpxUrl`, then the app automatically advances to the 2D Map step
- [ ] Given a mobile user, when tapping the upload area, then the native file picker opens and allows file selection

### Technical Notes
- Component lives in `components/upload/`
- File type check: extension `.gpx` + MIME type validation client-side before sending to API
- On success, store `gpxUrl` and `routeBounds` in Zustand; advance stepper
- Skeleton/loading state required (see TV-016 for shared loading pattern)

### Dependencies
- Blocked by: TV-001, TV-003, TV-004
- Blocks: TV-007

---

## TV-003 GPX Parsing & Elevation Validation

**Type**: Technical  
**Jira Type**: Task  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 1  
**Labels**: `backend`, `gpx`, `validation`

### Description
As a developer, I want server-side GPX parsing and elevation validation in the upload API, so that only valid, elevation-containing GPX files progress through the configurator.

### Acceptance Criteria
- [ ] Given a valid GPX file with elevation data (`<ele>` tags), when `POST /api/gpx/upload` is called, then the response includes `hasElevation: true` and `routeBounds`
- [ ] Given a GPX file missing all `<ele>` tags, when uploaded, then the API returns `{ success: false, errorCode: "NO_ELEVATION_DATA", message: "..." }` with a friendly German error message
- [ ] Given a file that is not a valid GPX (corrupted XML), when uploaded, then the API returns `{ success: false, errorCode: "INVALID_GPX_FORMAT" }`
- [ ] Given a valid GPX file, when parsed, then `routeBounds` (`minLat`, `maxLat`, `minLng`, `maxLng`) are correctly computed
- [ ] Given any upload, when the API processes it, then file size is checked against a configured maximum (e.g. 10 MB)

### Technical Notes
- API handler: `api/upload-gpx/`
- Use a GPX parser library (e.g. `gpxparser` or similar) for XML parsing
- Server-side MIME check in addition to extension check
- Elevation validation: at least one trackpoint must have a non-zero `<ele>` value
- `routeBounds` derived from all `<trkpt>` coordinates

### Dependencies
- Blocked by: TV-001
- Blocks: TV-002, TV-004

---

## TV-004 GPX Storage Integration

**Type**: Technical  
**Jira Type**: Task  
**Priority**: High  
**Complexity**: Medium  
**Phase**: Phase 1  
**Labels**: `backend`, `storage`, `infrastructure`

### Description
As a developer, I want GPX files stored in an external object store (Cloudflare R2 or S3-compatible), so that files are accessible to the terrain API and linkable from Shopify orders.

### Acceptance Criteria
- [ ] Given a valid GPX file, when the upload API processes it, then the file is stored with a UUID-based key (no original filename, no customer PII in path)
- [ ] Given a stored file, when the API returns `gpxUrl`, then the URL is a publicly accessible HTTPS URL pointing to the stored file
- [ ] Given an upload failure in storage, when the error occurs, then the API returns a 500 error with a user-friendly message and does not expose internal details
- [ ] Given the environment variables `GPX_STORAGE_BUCKET`, `GPX_STORAGE_ACCESS_KEY`, `GPX_STORAGE_SECRET_KEY` are set, then the app connects to storage without code changes
- [ ] Given a unit test environment, when running tests, then storage calls are mockable via dependency injection

### Technical Notes
- Storage adapter in `lib/storage/`; abstract interface so R2/S3 are swappable
- Filename pattern: `gpx/{uuid}.gpx`
- Environment variables per PRD Section 9
- Rate-limit upload endpoint (e.g. 10 requests/minute per IP)

### Dependencies
- Blocked by: TV-003
- Blocks: TV-002, TV-010

---

## TV-005 File Upload Security

**Type**: Technical  
**Jira Type**: Task  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 1  
**Labels**: `security`, `backend`

### Description
As a shop owner, I want the upload endpoint hardened against abuse, so that malicious files or excessive usage cannot compromise the system.

### Acceptance Criteria
- [ ] Given a request with `Content-Type` not matching `multipart/form-data`, when it reaches the upload API, then a 400 is returned
- [ ] Given a file exceeding the size limit, when uploaded, then the server rejects it before full ingestion with a 413 response
- [ ] Given a MIME type other than `application/gpx+xml` or `text/xml`, when sent, then the server rejects the upload with a clear error
- [ ] Given the upload endpoint, when a single IP sends more than the configured rate limit, then subsequent requests receive 429 Too Many Requests
- [ ] Given any stored file, when inspecting the stored path, then no original customer filename or PII is present in the object key

### Technical Notes
- MIME validation on the server using magic bytes or `Content-Type` header check
- Rate limiting via middleware (e.g. `upstash/ratelimit` or equivalent)
- File size limit configurable via env var (default: 10 MB)
- All security checks in `api/upload-gpx/` middleware layer

### Dependencies
- Blocked by: TV-003
- Blocks: TV-002

---

---

# Phase 2: 2D Map Viewer

---

## TV-007 2D Map Viewer with Route Display

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Medium  
**Phase**: Phase 2  
**Labels**: `frontend`, `map`, `maplibre`

### Description
As a customer, I want to see my uploaded route drawn on an OpenStreetMap-based 2D map with zoom support, so that I can verify my correct track is being used before proceeding to the 3D preview.

### Acceptance Criteria
- [ ] Given a successfully uploaded GPX, when the 2D Map step loads, then the map renders using MapLibre GL JS with OpenStreetMap tiles
- [ ] Given the map loads, when the route is rendered, then it appears as a clearly visible colored polyline centered within the viewport
- [ ] Given the map is displayed, when the user pinches/scrolls to zoom, then the map responds fluidly on both desktop and mobile
- [ ] Given the route bounds from the upload response, when the map initializes, then it auto-fits to show the entire route with padding
- [ ] Given the map is rendered, when inspecting the layout, then it is fully responsive and usable on a 375 px wide mobile screen

### Technical Notes
- Component: `components/map-viewer/`
- Feature logic: `features/map/`
- Use `routeBounds` from Zustand store to call `map.fitBounds()`
- Route rendered as `geojson` source + `line` layer in MapLibre
- OSM tile URL from env var `NEXT_PUBLIC_MAP_TILE_URL`
- Map rotation intentionally disabled (per PRD Out of Scope)

### Dependencies
- Blocked by: TV-001, TV-002
- Blocks: TV-008, TV-009

---

## TV-008 Bounding Shape Overlay (Circle & Hexagon)

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Medium  
**Phase**: Phase 2  
**Labels**: `frontend`, `map`, `geometry`

### Description
As a customer, I want to select between a circle and a hexagon bounding shape on the 2D map, so that I can choose the visual style of my physical terrain insert before seeing the 3D preview.

### Acceptance Criteria
- [ ] Given the 2D Map step, when the step loads, then Circle and Hexagon toggle buttons are visible
- [ ] Given Circle is selected, when the map renders, then a circular overlay centered on the route centroid is displayed
- [ ] Given Hexagon is selected, when switching from Circle, then the overlay updates to a regular hexagon shape without page reload
- [ ] Given either shape is selected, when the user advances to 3D Preview or Poster Mockup, then the selected shape is reflected in those steps
- [ ] Given the shape selection changes, when Zustand updates `shape`, then all downstream components re-render with the new shape

### Technical Notes
- Shape overlay as MapLibre `fill` + `line` layers using GeoJSON geometry
- Circle: generated with Turf.js `circle()` centered on route centroid, radius derived from route bounds
- Hexagon: Turf.js `hexGrid()` or custom regular hexagon geometry centered on route centroid
- Shape state stored in Zustand `ConfiguratorState.shape`
- Route/shape moving/resizing intentionally not supported (per PRD Out of Scope)

### Dependencies
- Blocked by: TV-007
- Blocks: TV-009, TV-011, TV-018

---

## TV-009 Out-of-Bounds Warning

**Type**: Feature  
**Jira Type**: Story  
**Priority**: Medium  
**Complexity**: Small  
**Phase**: Phase 2  
**Labels**: `frontend`, `map`, `validation`

### Description
As a customer, I want to be notified when my route extends outside the selected bounding shape, so that I can adjust the zoom level and avoid ordering a poster with an incomplete route.

### Acceptance Criteria
- [ ] Given a route that fits entirely within the bounding shape, when the map renders, then no warning is shown
- [ ] Given a route where any trackpoint falls outside the bounding shape, when the map renders, then a friendly warning message appears (in German)
- [ ] Given the warning is displayed, when the user zooms in (reducing the visible area covered by the bounding shape), then the out-of-bounds check re-evaluates and the warning updates accordingly
- [ ] Given the warning message, when a user reads it, then it clearly explains what is happening and suggests zooming in as a remedy
- [ ] Given a mobile user, when the warning is shown, then it does not obscure the map controls or the shape/route

### Technical Notes
- Out-of-bounds check: use Turf.js `booleanWithin()` or `booleanContains()` on route coordinates vs. shape polygon
- Re-evaluate on every map `zoom` event and on shape change
- Warning component: non-blocking toast or inline banner above map

### Dependencies
- Blocked by: TV-007, TV-008
- Blocks: —

---

---

# Phase 3: 3D Terrain Viewer

---

## TV-010 Three.js / React Three Fiber Setup

**Type**: Technical  
**Jira Type**: Task  
**Priority**: High  
**Complexity**: Medium  
**Phase**: Phase 3  
**Labels**: `frontend`, `3d`, `infrastructure`

### Description
As a developer, I want Three.js and React Three Fiber integrated into the project with shared camera controls and a reusable scene wrapper, so that all 3D features have a consistent rendering foundation.

### Acceptance Criteria
- [ ] Given the project dependencies, when installed, then `three`, `@react-three/fiber`, and `@react-three/drei` are present with no peer dependency conflicts
- [ ] Given the 3D step renders, when inspecting the DOM, then a `<canvas>` element exists and WebGL context is initialized
- [ ] Given a browser that does not support WebGL, when the 3D step loads, then a fallback message is displayed instead of a broken canvas
- [ ] Given the scene, when the user interacts with it, then orbit controls (rotate + zoom) work via both mouse and touch
- [ ] Given a low-end mobile device, when the scene renders, then the pixel ratio is capped to avoid performance degradation

### Technical Notes
- Component: `components/terrain-viewer/`
- Use `<Canvas>` from R3F with `OrbitControls` from Drei
- WebGL capability check on mount; render fallback if `!renderer.capabilities.isWebGL2`
- Pixel ratio capped at `Math.min(window.devicePixelRatio, 2)`
- Scene wrapper handles lighting (ambient + directional, tuned for monochrome product look)

### Dependencies
- Blocked by: TV-001, TV-004
- Blocks: TV-011, TV-012, TV-013, TV-015, TV-016, TV-017

---

## TV-011 Terrain Mesh & Route Rendering

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Large  
**Phase**: Phase 3  
**Labels**: `frontend`, `3d`, `terrain`, `geometry`

### Description
As a customer, I want to see a 3D terrain mesh of my route's geographic area with the route path rendered on the surface, so that I can visualize what the physical 3D-printed terrain insert will look like.

### Acceptance Criteria
- [ ] Given the 3D Preview step loads, when terrain data is fetched, then a height-mapped mesh matching the selected bounding shape (circle or hexagon) is rendered
- [ ] Given the terrain mesh, when rendered, then it has a visible base/sockel (flat rim) matching the product's physical form
- [ ] Given the route data, when the terrain renders, then the route polyline is projected onto the terrain surface and follows the elevation contours
- [ ] Given the terrain API response includes `heightmapUrl`, when the mesh is built, then elevation values are applied to the geometry vertices
- [ ] Given the terrain is rendered, when viewed on a mid-range smartphone, then the frame rate is acceptable (no visible jank during orbit)

### Technical Notes
- Terrain API: `GET /api/terrain/data?gpxUrl=...&shape=...`
- Build `PlaneGeometry` or custom mesh from heightmap; clip to circle/hexagon shape
- Route projected onto terrain: ray-cast each route segment against terrain surface
- Sockel: flat `CylinderGeometry` or `ExtrudeGeometry` beneath terrain, height ~5% of model
- Geometry complexity: 128×128 grid desktop, 64×64 mobile (see TV-017)

### Dependencies
- Blocked by: TV-010, TV-008
- Blocks: TV-012, TV-013, TV-014, TV-015

---

## TV-012 Terrain Visual Styling — Monochrome & Base

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 3  
**Labels**: `frontend`, `3d`, `design`

### Description
As a customer, I want the terrain to look like a real 3D-printed model with clean, monochrome materials and a visible base, so that the preview feels premium and product-accurate rather than like a GIS tool.

### Acceptance Criteria
- [ ] Given the 3D scene, when rendered with default settings, then terrain and base use a neutral gray (`MeshStandardMaterial`) with subtle ambient occlusion
- [ ] Given lighting in the scene, when the model is viewed, then surface detail is clearly visible without harsh shadows or overexposure
- [ ] Given the selected terrain color from Zustand, when `terrainColor` changes, then the terrain material color updates in real time without re-fetching data
- [ ] Given the base/sockel, when rendered, then it has the same color as the terrain and a clean sharp edge at the perimeter
- [ ] Given the overall scene, when a customer views it, then no grid, axes, or debug overlays are visible

### Technical Notes
- `MeshStandardMaterial` for terrain and base
- Single directional light + ambient light; no shadows (performance)
- Color mapping: `'gray' → #888888`, `'white' → #f5f5f5`, `'black' → #1a1a1a`
- Color values should match the physical print palette as closely as possible

### Dependencies
- Blocked by: TV-011
- Blocks: TV-014

---

## TV-013 Buildings Toggle

**Type**: Feature  
**Jira Type**: Story  
**Priority**: Medium  
**Complexity**: Medium  
**Phase**: Phase 3  
**Labels**: `frontend`, `3d`, `buildings`

### Description
As a customer, I want to optionally enable building footprints rendered as simple extruded blocks on the terrain, so that urban routes can show the city context and I can choose between a clean landscape and an urban look.

### Acceptance Criteria
- [ ] Given the 3D viewer, when a "Show Buildings" toggle is visible and turned off (default), then no buildings appear in the scene
- [ ] Given buildings are toggled on, when building data is available from the terrain API, then simple extruded box geometries appear at correct map positions
- [ ] Given buildings are toggled on but no building data is available for the region, when the toggle state changes, then a friendly message informs the customer that no building data is available here
- [ ] Given buildings are visible, when `buildingColor` in Zustand changes, then building materials update in real time
- [ ] Given buildings are toggled off, when the toggle is turned off, then buildings are removed from the scene without re-fetching terrain data

### Technical Notes
- Building data: `buildings.features[]` from `GET /api/terrain/data?buildings=true`
- Geometry: `ExtrudeGeometry` from OSM building footprint polygon + height attribute (or default 10 m)
- Buildings use same material system as terrain (see TV-012)
- Toggle state stored in Zustand `buildingsEnabled`

### Dependencies
- Blocked by: TV-011
- Blocks: —

---

## TV-014 Color Palette & Elevation Scale Controls

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 3  
**Labels**: `frontend`, `3d`, `ui`

### Description
As a customer, I want to select colors for the route, terrain, and buildings, and adjust the elevation exaggeration from 1× to 3×, so that I can tailor the visual style to my preferences and see changes immediately.

### Acceptance Criteria
- [ ] Given the 3D viewer controls, when rendered, then color pickers for Route (7 colors), Terrain (3 colors), and Buildings (3 colors) are all visible
- [ ] Given a route color selection (orange, green, blue, red, white, yellow, black), when a swatch is clicked, then the route line in the scene updates immediately
- [ ] Given a terrain or building color selection (gray, black, white), when a swatch is clicked, then the respective mesh material updates immediately
- [ ] Given the Elevation Scale slider (range 1–3, integer steps), when dragged, then the terrain mesh vertex heights are scaled in real time relative to the base
- [ ] Given any color or scale change, when it occurs, then the Zustand store updates and the value is preserved if the user navigates back to this step

### Technical Notes
- Color swatches: simple CSS circles with selected state ring; no external color picker library needed
- Elevation scale: multiply `geometry.attributes.position` Y-values by scale factor; re-apply on slider change
- Rebuilding geometry on each slider tick is acceptable for 64×64/128×128 grid sizes
- Controls in a side panel or collapsible bottom sheet on mobile

### Dependencies
- Blocked by: TV-012, TV-011
- Blocks: —

---

## TV-015 Touch & Mouse Camera Controls

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 3  
**Labels**: `frontend`, `3d`, `mobile`

### Description
As a customer, I want to rotate and zoom the 3D terrain model using both mouse drag/scroll and touch gestures, so that I can inspect the terrain from any angle on both desktop and mobile.

### Acceptance Criteria
- [ ] Given a desktop user, when they click-drag on the canvas, then the model orbits around its center
- [ ] Given a desktop user, when they scroll/pinch on the canvas, then the camera zooms in and out
- [ ] Given a mobile user, when they swipe with one finger, then the model orbits
- [ ] Given a mobile user, when they pinch with two fingers, then the camera zooms
- [ ] Given orbit controls, when the camera is moved, then the model stays centered (no accidental panning off-screen)

### Technical Notes
- Use `OrbitControls` from `@react-three/drei` with `enablePan={false}` to prevent off-center drift
- `enableDamping={true}` for smooth deceleration
- `minDistance` and `maxDistance` set to keep model always in frame

### Dependencies
- Blocked by: TV-010
- Blocks: —

---

## TV-016 Skeleton Preview & Loading States

**Type**: Feature  
**Jira Type**: Story  
**Priority**: Medium  
**Complexity**: Small  
**Phase**: Phase 3  
**Labels**: `frontend`, `ui`, `performance`

### Description
As a customer, I want to see a polished loading skeleton while the terrain data is being fetched, so that the app feels fast and premium rather than broken during network requests.

### Acceptance Criteria
- [ ] Given the 3D Preview step loads, when the terrain API request is in flight, then an animated skeleton placeholder (matching the shape — circle or hexagon) is visible in the canvas area
- [ ] Given the terrain data arrives, when the mesh is ready, then the skeleton fades out and the terrain fades in with a smooth transition
- [ ] Given the upload step, when the GPX file is uploading, then a progress indicator (spinner or progress bar) is visible
- [ ] Given any async operation, when it is in progress, then the "Next" step button is disabled to prevent premature navigation
- [ ] Given an error during terrain fetch, when it occurs, then a friendly error message replaces the skeleton (not a blank canvas)

### Technical Notes
- Skeleton: CSS-animated gradient div in the shape of the bounding form; no Three.js needed for the placeholder
- Use React Suspense boundaries around async terrain data fetch
- Transition: CSS opacity animation (200 ms) on scene visibility

### Dependencies
- Blocked by: TV-010
- Blocks: —

---

## TV-017 Mobile Performance Optimization

**Type**: Technical  
**Jira Type**: Task  
**Priority**: High  
**Complexity**: Medium  
**Phase**: Phase 3  
**Labels**: `performance`, `mobile`, `3d`

### Description
As a developer, I want the 3D viewer to detect mobile devices and reduce geometry complexity and rendering quality accordingly, so that the viewer runs smoothly on mid-range smartphones without exceeding GPU/memory limits.

### Acceptance Criteria
- [ ] Given a mobile device (detected via `navigator.maxTouchPoints > 0` or user agent), when the terrain mesh is built, then resolution is set to 64×64 instead of 128×128
- [ ] Given a mobile device, when the scene renders, then the pixel ratio is capped at 1.5
- [ ] Given buildings are enabled on mobile, when many footprints are present, then only the N largest (configurable, e.g. 50) buildings are rendered
- [ ] Given the 3D viewer on a mid-range 2023 Android device, when orbiting the model, then no severe frame drops are observed (target: ≥ 30 FPS during interaction)
- [ ] Given `quality=mobile` is passed to `GET /api/terrain/data`, when the API responds, then it returns a lower-resolution heightmap appropriate for mobile rendering

### Technical Notes
- Quality detection utility in `lib/geometry/deviceQuality.ts`
- Pass `quality` param to terrain API based on device detection
- Buildings cap: sort by area, take top N; computed client-side from feature list
- Consider `frameloop="demand"` in R3F `<Canvas>` so frames only render on interaction

### Dependencies
- Blocked by: TV-011
- Blocks: —

---

---

# Phase 4: Poster Mockup & Shopify Integration

---

## TV-018 Poster Mockup UI

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Medium  
**Phase**: Phase 4  
**Labels**: `frontend`, `ui`, `mockup`

### Description
As a customer, I want to see a realistic poster mockup showing my terrain insert centered in a framed poster layout, so that I have a clear sense of what the physical product will look like before I place my order.

### Acceptance Criteria
- [ ] Given the Poster Mockup step, when it loads, then a poster frame/mat illustration is visible with the terrain shape (circle or hexagon) prominently centered in the upper area
- [ ] Given the shape selected in Step 2, when the mockup renders, then the terrain cutout uses the correct shape
- [ ] Given a standard desktop viewport, when the mockup is displayed, then it fits within the viewport without scrolling for the key poster area
- [ ] Given a mobile viewport (375 px), when the mockup is displayed, then it is responsive and all elements remain legible
- [ ] Given the terrain colors and route color from Zustand, when the mockup renders, then the terrain insert reflects those selections

### Technical Notes
- Component: `components/poster-mockup/`
- Poster illustration: CSS-based (border, shadow, mat) rather than an image, so colors adapt dynamically
- Terrain insert in mockup: use a static 2D render/screenshot of the current Three.js scene OR a simplified CSS/SVG representation using current color values
- Shape clipping: CSS `clip-path` circle or custom polygon for hexagon

### Dependencies
- Blocked by: TV-001, TV-008, TV-012
- Blocks: TV-019, TV-020

---

## TV-019 Poster Text Input & Validation

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 4  
**Labels**: `frontend`, `forms`, `ui`

### Description
As a customer, I want to manually enter my name, event name, date, time, distance, elevation gain, and optional extras, and see them appear live in the poster mockup, so that the poster reflects my personal achievement.

### Acceptance Criteria
- [ ] Given the Poster Mockup step, when text fields are rendered, then inputs for Name, Event, Datum, Zeit, Distanz, Höhenmeter, and an optional free-text field are visible
- [ ] Given the customer types in any field, when the value changes, then the poster mockup updates in real time without losing focus
- [ ] Given the form, when the customer tries to advance to cart, then any empty required fields (Name and Datum at minimum) are highlighted with a validation message
- [ ] Given the form is valid, when the customer proceeds, then all field values are stored in Zustand `posterText` and passed to the cart payload
- [ ] Given a mobile user, when the keyboard opens, then the form scrolls so the active field is visible above the keyboard

### Technical Notes
- Use React Hook Form + Zod for validation
- Fields: `name` (required), `event`, `date`, `time`, `distance`, `elevation`, `extra` (optional)
- Poster mockup reads from Zustand `posterText`; React Hook Form `watch()` updates Zustand on change
- Label layout below terrain insert in mockup matches product physical layout

### Dependencies
- Blocked by: TV-018
- Blocks: TV-020

---

## TV-020 Shopify Add-to-Cart Integration

**Type**: Feature  
**Jira Type**: Story  
**Priority**: High  
**Complexity**: Medium  
**Phase**: Phase 4  
**Labels**: `frontend`, `shopify`, `checkout`

### Description
As a customer, I want to add the configured terrain poster to my Shopify cart with a single click, so that I can complete my purchase without leaving or re-entering any information.

### Acceptance Criteria
- [ ] Given the final Cart step (or Add-to-Cart button in Poster Mockup), when the button is clicked, then `POST /api/shopify/cart` is called with the full configurator payload
- [ ] Given a successful cart response, when `cartUrl` is returned, then the user is redirected to the Shopify cart page
- [ ] Given a network error during cart submission, when it occurs, then a user-friendly error message is shown and the button becomes active again
- [ ] Given the cart API payload, when inspecting it, then it includes `variantId`, `gpxUrl`, `shape`, route/terrain/building colors, `buildingsEnabled`, `elevationScale`, and all `posterText` fields
- [ ] Given the Shopify Line Item Properties, when the order is viewed in Shopify Admin, then all customer data and the GPX reference URL are visible as named properties

### Technical Notes
- Cart API: `POST /api/shopify/cart` (see PRD Section 10.3)
- Use Shopify AJAX Cart API (`/cart/add.js`) if embedding within Shopify theme; use Storefront API otherwise
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` and `NEXT_PUBLIC_SHOPIFY_PRODUCT_ID` from env vars
- `variantId` is the Shopify product variant ID from env var `NEXT_PUBLIC_SHOPIFY_PRODUCT_ID`

### Dependencies
- Blocked by: TV-018, TV-019, TV-021
- Blocks: —

---

## TV-021 GPX Reference in Order (Shopify Line Item Properties)

**Type**: Technical  
**Jira Type**: Task  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 4  
**Labels**: `backend`, `shopify`, `integration`

### Description
As a shop owner, I want every Shopify order to include the GPX file URL and all customer configuration data as Line Item Properties, so that I can manually produce the correct terrain poster for each order.

### Acceptance Criteria
- [ ] Given an Add-to-Cart request, when the cart API handler processes it, then Shopify Line Item Properties include: `GPX Datei`, `Form`, `Route Farbe`, `Terrain Farbe`, `Gebäude`, `Elevation Scale`, `Name`, `Event`, `Datum`, `Zeit`, `Distanz`
- [ ] Given a completed Shopify order, when viewed in Shopify Admin, then all Line Item Properties are visible next to the order line item
- [ ] Given the GPX URL in Line Item Properties, when clicked by the shop owner, then the GPX file is downloadable
- [ ] Given the cart API, when it receives an invalid `variantId`, then it returns a clear error without creating a cart entry
- [ ] Given a successful add-to-cart, when the cart payload is sent, then the response includes a `cartUrl` for redirect

### Technical Notes
- Line Item Properties key names in German (as per PRD Section 10.3 example)
- Properties map directly from `ConfiguratorState` fields
- Cart API handler: `api/shopify-cart/`
- No dynamic pricing in MVP; fixed variant price used

### Dependencies
- Blocked by: TV-004
- Blocks: TV-020

---

---

# Cross-Cutting Technical Stories

---

## TV-022 Privacy / DSGVO Notice

**Type**: Technical  
**Jira Type**: Task  
**Priority**: Medium  
**Complexity**: Small  
**Phase**: Phase 1 (display at Upload step)  
**Labels**: `legal`, `frontend`, `privacy`

### Description
As a customer, I want to be informed about how my GPX file (which may contain sensitive location data) is used and stored, so that I can make an informed decision before uploading.

### Acceptance Criteria
- [ ] Given the Upload step, when it loads, then a privacy notice is displayed before or alongside the upload zone
- [ ] Given the privacy notice, when a customer reads it, then it states: the file is used solely for producing their order, it is stored on a secure server, and it may be retained for production/fulfillment purposes
- [ ] Given the notice, when displayed, then it references the shop's privacy policy (link or inline text)
- [ ] Given the customer proceeds to upload, when the upload completes, then consent to storage is implied and logged (even if only in app logs for MVP)
- [ ] Given any stored GPX, when the file path is inspected, then no customer PII is included in the storage key (verified by TV-004 and TV-005)

### Technical Notes
- Simple inline text block above upload zone; no modal or separate consent screen required for MVP
- Full consent management system is explicitly out of scope for MVP (see PRD Section 9)

### Dependencies
- Blocked by: TV-001
- Blocks: TV-002

---

## TV-023 Deployment & Environment Setup

**Type**: Technical  
**Jira Type**: Task  
**Priority**: High  
**Complexity**: Small  
**Phase**: Phase 1  
**Labels**: `infrastructure`, `deployment`

### Description
As a developer, I want the app deployed to a production-grade hosting environment with all required environment variables configured, so that the configurator is accessible over HTTPS from a Shopify product page.

### Acceptance Criteria
- [ ] Given the repository, when pushed to the main branch, then a CI/CD pipeline builds and deploys the Next.js app (e.g. Vercel)
- [ ] Given the deployed app, when accessed via browser, then it is served exclusively over HTTPS
- [ ] Given the app is embedded in a Shopify product page, when a customer visits the product page, then the configurator loads without cross-origin errors
- [ ] Given the environment variables listed in PRD Section 9 (`NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`, `GPX_STORAGE_*`, `NEXT_PUBLIC_MAP_TILE_URL`), when configured in the hosting environment, then the app functions end-to-end without code changes
- [ ] Given Mobile Safari on iOS 16+, when the configurator loads, then all steps render correctly and WebGL is supported

### Technical Notes
- Hosting: Vercel (recommended per PRD Section 8)
- Shopify embed: Theme App Extension or `<script>` embed in product page liquid template
- CDN for static assets handled by Vercel automatically
- CORS: configure allowed origins to include Shopify store domain
- WebGL fallback message for unsupported browsers (see TV-010)

### Dependencies
- Blocked by: TV-001
- Blocks: — (enables all other stories to be testable in staging/production)

---

---

# Story Summary

| ID | Title | Type | Priority | Complexity | Phase |
|---|---|---|---|---|---|
| TV-001 | Project Setup & Stepper Flow | Task | High | Medium | 1 |
| TV-002 | GPX Upload UI | Story | High | Small | 1 |
| TV-003 | GPX Parsing & Elevation Validation | Task | High | Small | 1 |
| TV-004 | GPX Storage Integration | Task | High | Medium | 1 |
| TV-005 | File Upload Security | Task | High | Small | 1 |
| TV-007 | 2D Map Viewer with Route Display | Story | High | Medium | 2 |
| TV-008 | Bounding Shape Overlay | Story | High | Medium | 2 |
| TV-009 | Out-of-Bounds Warning | Story | Medium | Small | 2 |
| TV-010 | Three.js / React Three Fiber Setup | Task | High | Medium | 3 |
| TV-011 | Terrain Mesh & Route Rendering | Story | High | Large | 3 |
| TV-012 | Terrain Visual Styling | Story | High | Small | 3 |
| TV-013 | Buildings Toggle | Story | Medium | Medium | 3 |
| TV-014 | Color Palette & Elevation Scale Controls | Story | High | Small | 3 |
| TV-015 | Touch & Mouse Camera Controls | Story | High | Small | 3 |
| TV-016 | Skeleton Preview & Loading States | Story | Medium | Small | 3 |
| TV-017 | Mobile Performance Optimization | Task | High | Medium | 3 |
| TV-018 | Poster Mockup UI | Story | High | Medium | 4 |
| TV-019 | Poster Text Input & Validation | Story | High | Small | 4 |
| TV-020 | Shopify Add-to-Cart Integration | Story | High | Medium | 4 |
| TV-021 | GPX Reference in Order | Task | High | Small | 4 |
| TV-022 | Privacy / DSGVO Notice | Task | Medium | Small | 1 |
| TV-023 | Deployment & Environment Setup | Task | High | Small | 1 |

---

# Dependency Graph

```
TV-001
├── TV-002 (needs TV-003, TV-004, TV-005)
│   └── TV-007
│       ├── TV-008
│       │   ├── TV-009
│       │   └── TV-011 (needs TV-010)
│       │       ├── TV-012
│       │       │   └── TV-014
│       │       ├── TV-013
│       │       ├── TV-015
│       │       └── TV-017
│       └── TV-018 (needs TV-012)
│           ├── TV-019
│           │   └── TV-020 (needs TV-021)
│           └── TV-020
├── TV-003 → TV-004 → TV-005
├── TV-004 → TV-021
├── TV-010 → TV-011, TV-015, TV-016
└── TV-022
TV-023 (independent, enables staging)
```

---

*Stories align with all 30+ MVP features in PRD Section 4, all 9 user stories in PRD Section 5, all 3 API endpoints in PRD Section 10, and all 4 implementation phases in PRD Section 12.*
