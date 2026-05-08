# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Terrain Poster Configurator** — a Shopify-embedded web configurator where customers upload a `.gpx` file, preview their route in 2D and 3D, and order a physical poster with a 3D-printed terrain insert. The app is preview-first: no production files (3MF, STL) are generated. The GPX file is stored externally; only a reference URL is passed to Shopify.

Full requirements: `.agents/PRD/PRD.md`  
User stories: `.agents/stories/stories.md`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| UI | React 18+, TypeScript 5+, Tailwind CSS 3+ |
| State | Zustand |
| Forms | React Hook Form + Zod |
| 2D Map | MapLibre GL JS + OpenStreetMap tiles |
| 3D Rendering | Three.js + React Three Fiber + Drei |
| Geo Processing | GPX parser library + Turf.js |
| Storage | Cloudflare R2 (or S3-compatible) |
| Shopify | AJAX Cart API + Line Item Properties |
| Hosting | Vercel |

---

## Commands

> The project has not been scaffolded yet. Once `apps/web/` exists, commands will follow Next.js/pnpm conventions:

```bash
pnpm install
pnpm run dev        # start dev server
pnpm run build      # production build (also type-checks)
pnpm run lint       # ESLint
pnpm test           # test runner (TBD)
```

---

## Architecture

### Directory Structure

```
apps/
  web/
    app/
      product-configurator/   # main configurator route
    components/
      upload/                 # GPX file drop zone
      map-viewer/             # MapLibre 2D map
      terrain-viewer/         # Three.js 3D scene
      poster-mockup/          # poster frame + text layout
      shopify/                # cart integration UI
      ui/                     # shared primitives
    features/
      gpx/                    # parsing, validation helpers
      map/                    # bounds, shape, out-of-bounds logic
      terrain/                # mesh building, elevation scaling
      mockup/                 # poster rendering logic
      checkout/               # Shopify payload assembly
    lib/
      gpx/                    # GPX parser wrappers
      geometry/               # circle/hexagon generation (Turf.js)
      terrain/                # heightmap → mesh conversion
      shopify/                # cart API client
      storage/                # R2/S3 adapter (abstract interface)
    types/
      configurator.ts         # ConfiguratorState (canonical type)
api/
  upload-gpx/                 # POST /api/gpx/upload
  terrain-data/               # GET /api/terrain/data
  shopify-cart/               # POST /api/shopify/cart
.agents/
  PRD/PRD.md                  # product requirements
  stories/stories.md          # user stories (TV-001–TV-023)
  plans/                      # implementation plans (from /plan)
```

### Step Flow (State Machine)

The configurator advances linearly through five steps. Step state is managed in a single Zustand store. Moving forward is gated by step-level validation; moving back preserves all existing state.

```
UPLOAD → 2D_MAP → 3D_PREVIEW → POSTER_MOCKUP → CART
```

### Central Config State

All viewer components and the cart payload read from one shared `ConfiguratorState` in Zustand. The canonical type lives in `types/configurator.ts`:

```ts
type ConfiguratorState = {
  gpxUrl: string | null;
  shape: 'circle' | 'hexagon';
  elevationScale: 1 | 2 | 3;
  buildingsEnabled: boolean;
  routeColor: 'orange' | 'green' | 'blue' | 'red' | 'white' | 'yellow' | 'black';
  terrainColor: 'gray' | 'black' | 'white';
  buildingColor: 'gray' | 'black' | 'white';
  posterText: {
    name?: string;
    event?: string;
    date?: string;
    time?: string;
    distance?: string;
    elevation?: string;
    extra?: string;
  };
};
```

---

## Key Design Decisions

### Preview-Only — No Production Files
The 3D viewer is a product preview. No 3MF, STL, or sliceable geometry is generated. Never add production-file generation to the MVP scope.

### External GPX Storage
GPX files are stored in R2/S3 under UUID keys (`gpx/{uuid}.gpx`). Shopify receives only the URL as a Line Item Property. The storage adapter in `lib/storage/` abstracts R2 vs S3 so the implementation is swappable without touching API handlers.

### Shape Geometry (Circle vs. Hexagon)
The bounding shape is generated client-side with Turf.js, centered on the route centroid. It is displayed in 2D as a MapLibre overlay and reused in 3D for mesh clipping and the poster mockup. The shape cannot be manually repositioned or resized (MVP constraint).

### Mobile Performance
Device quality is detected in `lib/geometry/deviceQuality.ts`. Mobile gets 64×64 terrain resolution and a capped pixel ratio (≤ 1.5); desktop gets 128×128. The terrain API accepts a `quality` param (`mobile` | `preview` | `desktop`). The R3F `<Canvas>` should use `frameloop="demand"` to avoid continuous renders.

### Shopify Integration
Use the AJAX Cart API (`/cart/add.js`) when embedded in a Shopify theme; Storefront API otherwise. All configurator data is passed as named Line Item Properties in German (matching PRD Section 10.3 key names: `GPX Datei`, `Form`, `Route Farbe`, etc.).

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/gpx/upload` | Validate, store GPX; returns `gpxUrl` + `routeBounds` |
| `GET` | `/api/terrain/data` | Fetch heightmap + optional building GeoJSON |
| `POST` | `/api/shopify/cart` | Add configured product to Shopify cart |

Full request/response shapes are in `.agents/PRD/PRD.md` §10.

### Upload API Error Codes
- `NO_ELEVATION_DATA` — GPX has no `<ele>` tags
- `INVALID_GPX_FORMAT` — malformed XML
- Upload is rate-limited per IP; file size capped (default 10 MB)

---

## Environment Variables

```env
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=
NEXT_PUBLIC_SHOPIFY_PRODUCT_ID=
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
GPX_STORAGE_BUCKET=
GPX_STORAGE_ACCESS_KEY=
GPX_STORAGE_SECRET_KEY=
NEXT_PUBLIC_MAP_TILE_URL=
```

---

## MVP Constraints (Out of Scope)

Do not implement these — they are explicitly deferred:
- 3MF / STL / production file generation
- Multiple GPX files per order
- Route or shape manual repositioning
- Dynamic pricing
- Automatic GPX stat calculation (distance, elevation) — users enter manually
- User accounts or saved projects
- Map rotation

---

## Agent Workflow

Custom slash commands for this project:

| Command | Purpose |
|---|---|
| `/prime` | Load project context and recent Jira issues |
| `/plan <feature or PRD path>` | Generate an implementation plan in `.agents/plans/` |
| `/create-user-stories <prd-path>` | Generate user stories from a PRD |

Implementation plans are saved to `.agents/plans/{name}.plan.md` and include pattern references, file lists, and ordered tasks. Read the plan before starting any implementation.
