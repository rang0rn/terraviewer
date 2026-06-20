# Plan: TV-001 — Project Setup & Stepper Flow

## Summary

Bootstrap the Terrain Poster Configurator as a pnpm monorepo with Next.js 14 (App Router) in `apps/web/`. The output is a runnable shell: TypeScript in strict mode, Tailwind CSS wired, a Zustand store holding the canonical `ConfiguratorState`, and a 5-step configurator route (`/product-configurator/upload` → `/map` → `/preview` → `/mockup` → `/cart`) with a shared stepper component in the layout. Every subsequent story (TV-002 through TV-023) builds on top of this scaffold — no feature logic is implemented here.

## User Story

As a developer,  
I want a working Next.js project with a step-based configurator shell,  
So that all subsequent feature stories have a consistent, navigable foundation.

## Metadata

| Field | Value |
|---|---|
| Type | NEW_CAPABILITY |
| Complexity | MEDIUM |
| Systems Affected | Project root, `apps/web/` (all layers) |
| Jira Issue | TV-001 |
| Blocks | TV-002, TV-007, TV-010, TV-018 |

---

## Greenfield Note

No existing codebase to mirror. The patterns defined in this plan become the project baseline. Every future story must follow them.

---

## Patterns Established by This Plan

### File & Folder Naming
```
kebab-case  → file and folder names (stepper.tsx, step-navigation.tsx)
PascalCase  → exported React component names (Stepper, StepNavigation)
camelCase   → variables, functions, store actions
UPPER_SNAKE → constants (STEPS, DEFAULT_STATE)
```

### `'use client'` Rule
Only add `'use client'` when the file uses React state/effects/events or browser APIs. Server Components are the default. The layout shell is a Server Component; the stepper (reads Zustand) is a Client Component.

### Zustand Store Structure
One `create<T>()` call per domain. State + actions in the same object. No slices for MVP.
```ts
// Pattern: lib/store/configurator.ts
export const useConfiguratorStore = create<ConfiguratorStore>((set, get) => ({
  // state fields first
  currentStep: 'upload',
  gpxUrl: null,
  // ...rest of ConfiguratorState

  // actions second
  updateConfig: (key, value) => set((s) => ({ ...s, [key]: value })),
  advanceStep: () => { ... },
}))
```

### TypeScript: Types vs. Interfaces
- `type` for data shapes and unions (ConfiguratorState, StepId, RouteColor)
- `interface` for React component props

### Tailwind
No custom CSS files or CSS Modules. All styling via Tailwind utilities. Global styles only in `app/globals.css` (Tailwind directives + CSS custom properties for brand tokens).

---

## Files to Create

| File | Purpose |
|---|---|
| `package.json` | Root workspace config (pnpm workspaces) |
| `pnpm-workspace.yaml` | Declare `apps/*` packages |
| `apps/web/package.json` | Next.js app dependencies |
| `apps/web/next.config.ts` | Next.js config (strict mode, transpile) |
| `apps/web/tsconfig.json` | TypeScript strict + path aliases |
| `apps/web/tailwind.config.ts` | Tailwind content paths + brand tokens |
| `apps/web/postcss.config.mjs` | PostCSS for Tailwind |
| `apps/web/app/globals.css` | Tailwind directives |
| `apps/web/app/layout.tsx` | Root layout (html, body, fonts) |
| `apps/web/app/page.tsx` | Root page → redirect to configurator |
| `apps/web/types/configurator.ts` | `ConfiguratorState`, `StepId`, color union types |
| `apps/web/lib/store/configurator.ts` | Zustand store (state + navigation actions) |
| `apps/web/components/ui/stepper.tsx` | Progress indicator (Client Component) |
| `apps/web/components/ui/step-navigation.tsx` | Next / Back buttons (Client Component) |
| `apps/web/app/product-configurator/layout.tsx` | Configurator shell (stepper + main area) |
| `apps/web/app/product-configurator/page.tsx` | Redirect → `/product-configurator/upload` |
| `apps/web/app/product-configurator/upload/page.tsx` | Step 1 stub |
| `apps/web/app/product-configurator/map/page.tsx` | Step 2 stub |
| `apps/web/app/product-configurator/preview/page.tsx` | Step 3 stub |
| `apps/web/app/product-configurator/mockup/page.tsx` | Step 4 stub |
| `apps/web/app/product-configurator/cart/page.tsx` | Step 5 stub |
| `.env.local.example` | All required env vars (empty values) |

---

## Tasks

Execute in order. Each task is independently verifiable.

---

### Task 1: Root monorepo scaffold

- **Files**: `package.json`, `pnpm-workspace.yaml`
- **Action**: CREATE
- **Implement**:

`package.json`:
```json
{
  "name": "terrain-poster-configurator",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter web build",
    "lint": "pnpm --filter web lint"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
```

- **Validate**: `pnpm install` completes without error

---

### Task 2: Next.js app init

- **File**: `apps/web/package.json`
- **Action**: CREATE
- **Implement**: Run `pnpm create next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"` OR create manually:

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10",
    "eslint": "^8",
    "eslint-config-next": "^14.2.0",
    "postcss": "^8",
    "tailwindcss": "^3.4.0",
    "typescript": "^5"
  }
}
```

- **Validate**: `pnpm install` inside `apps/web/` resolves all packages

---

### Task 3: TypeScript strict configuration

- **File**: `apps/web/tsconfig.json`
- **Action**: CREATE
- **Implement**:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- **Validate**: `pnpm run build` exits with zero TypeScript errors

---

### Task 4: Tailwind + PostCSS configuration

- **Files**: `apps/web/tailwind.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/app/globals.css`
- **Action**: CREATE
- **Implement**:

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand tokens — expand as design evolves
        surface: '#f5f5f5',
        ink: '#1a1a1a',
      },
    },
  },
  plugins: [],
}

export default config
```

`postcss.config.mjs`:
```js
const config = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
export default config
```

`globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- **Validate**: `pnpm run dev` — no Tailwind errors in console; utility classes render correctly

---

### Task 5: Define canonical types

- **File**: `apps/web/types/configurator.ts`
- **Action**: CREATE
- **Implement**:

```ts
export type StepId = 'upload' | 'map' | 'preview' | 'mockup' | 'cart'

export type RouteColor = 'orange' | 'green' | 'blue' | 'red' | 'white' | 'yellow' | 'black'
export type TerrainColor = 'gray' | 'black' | 'white'
export type Shape = 'circle' | 'hexagon'
export type ElevationScale = 1 | 2 | 3

export type RouteBounds = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export type PosterText = {
  name?: string
  event?: string
  date?: string
  time?: string
  distance?: string
  elevation?: string
  extra?: string
}

export type ConfiguratorState = {
  gpxUrl: string | null
  routeBounds: RouteBounds | null
  shape: Shape
  elevationScale: ElevationScale
  buildingsEnabled: boolean
  routeColor: RouteColor
  terrainColor: TerrainColor
  buildingColor: TerrainColor
  posterText: PosterText
}
```

- **Validate**: Import from any `.ts` file — zero type errors

---

### Task 6: Zustand configurator store

- **File**: `apps/web/lib/store/configurator.ts`
- **Action**: CREATE
- **Implement**:

```ts
'use client'

import { create } from 'zustand'
import type { ConfiguratorState, StepId } from '@/types/configurator'

const STEP_ORDER: StepId[] = ['upload', 'map', 'preview', 'mockup', 'cart']

const DEFAULT_STATE: ConfiguratorState = {
  gpxUrl: null,
  routeBounds: null,
  shape: 'circle',
  elevationScale: 1,
  buildingsEnabled: false,
  routeColor: 'orange',
  terrainColor: 'gray',
  buildingColor: 'gray',
  posterText: {},
}

type ConfiguratorStore = ConfiguratorState & {
  currentStep: StepId
  updateConfig: <K extends keyof ConfiguratorState>(key: K, value: ConfiguratorState[K]) => void
  advanceStep: () => void
  retreatStep: () => void
  canAdvance: () => boolean
}

export const useConfiguratorStore = create<ConfiguratorStore>((set, get) => ({
  ...DEFAULT_STATE,
  currentStep: 'upload',

  updateConfig: (key, value) => set((s) => ({ ...s, [key]: value })),

  advanceStep: () => {
    const { currentStep } = get()
    const idx = STEP_ORDER.indexOf(currentStep)
    if (idx < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[idx + 1] })
    }
  },

  retreatStep: () => {
    const { currentStep } = get()
    const idx = STEP_ORDER.indexOf(currentStep)
    if (idx > 0) {
      set({ currentStep: STEP_ORDER[idx - 1] })
    }
  },

  // Gate logic: each story (TV-002, TV-007, etc.) will refine this
  canAdvance: () => {
    const { currentStep, gpxUrl } = get()
    if (currentStep === 'upload') return gpxUrl !== null
    return true
  },
}))
```

- **Validate**: Import in a test component — Zustand store initialises; `updateConfig` mutates state

---

### Task 7: Stepper component

- **File**: `apps/web/components/ui/stepper.tsx`
- **Action**: CREATE
- **Implement**:

```tsx
'use client'

import { useConfiguratorStore } from '@/lib/store/configurator'
import type { StepId } from '@/types/configurator'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'map', label: '2D Map' },
  { id: 'preview', label: '3D Preview' },
  { id: 'mockup', label: 'Poster' },
  { id: 'cart', label: 'Order' },
]

const STEP_ORDER: StepId[] = STEPS.map((s) => s.id)

export function Stepper() {
  const currentStep = useConfiguratorStore((s) => s.currentStep)
  const currentIdx = STEP_ORDER.indexOf(currentStep)

  return (
    <nav aria-label="Configurator steps" className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx
        const isActive = idx === currentIdx

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  isActive ? 'bg-ink text-white' : '',
                  isCompleted ? 'bg-ink/20 text-ink' : '',
                  !isActive && !isCompleted ? 'border border-ink/20 text-ink/40' : '',
                ].join(' ')}
              >
                {isCompleted ? '✓' : idx + 1}
              </span>
              <span className={`hidden text-xs sm:block ${isActive ? 'font-semibold text-ink' : 'text-ink/40'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-8 ${isCompleted ? 'bg-ink/40' : 'bg-ink/10'}`} />
            )}
          </div>
        )
      })}
    </nav>
  )
}
```

- **Validate**: Renders in layout — active step highlighted, completed steps marked ✓

---

### Task 8: Step navigation (Next / Back buttons)

- **File**: `apps/web/components/ui/step-navigation.tsx`
- **Action**: CREATE
- **Implement**:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useConfiguratorStore } from '@/lib/store/configurator'

const STEP_ROUTES: Record<string, string> = {
  upload: '/product-configurator/upload',
  map: '/product-configurator/map',
  preview: '/product-configurator/preview',
  mockup: '/product-configurator/mockup',
  cart: '/product-configurator/cart',
}

export function StepNavigation() {
  const router = useRouter()
  const { currentStep, advanceStep, retreatStep, canAdvance } = useConfiguratorStore()

  const handleNext = () => {
    if (!canAdvance()) return
    advanceStep()
    const store = useConfiguratorStore.getState()
    router.push(STEP_ROUTES[store.currentStep])
  }

  const handleBack = () => {
    retreatStep()
    const store = useConfiguratorStore.getState()
    router.push(STEP_ROUTES[store.currentStep])
  }

  const isFirstStep = currentStep === 'upload'
  const isLastStep = currentStep === 'cart'

  return (
    <div className="flex justify-between border-t border-ink/10 px-6 py-4">
      <button
        onClick={handleBack}
        disabled={isFirstStep}
        className="rounded px-4 py-2 text-sm font-medium text-ink/60 hover:text-ink disabled:opacity-0"
      >
        Back
      </button>
      {!isLastStep && (
        <button
          onClick={handleNext}
          disabled={!canAdvance()}
          className="rounded bg-ink px-6 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Next
        </button>
      )}
    </div>
  )
}
```

- **Validate**: Clicking Next/Back updates `currentStep` in store and navigates to correct route

---

### Task 9: Next.js config

- **File**: `apps/web/next.config.ts`
- **Action**: CREATE
- **Implement**:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // No custom config needed for TV-001; extend in later stories
}

export default nextConfig
```

- **Validate**: `pnpm run build` reads config without error

---

### Task 10: Root layout and app entry

- **Files**: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- **Action**: CREATE
- **Implement**:

`apps/web/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Terrain Poster Configurator',
  description: 'Create your personal terrain poster from a GPX route',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} bg-surface text-ink antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

`apps/web/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/product-configurator/upload')
}
```

- **Validate**: Visiting `/` in browser immediately redirects to `/product-configurator/upload`

---

### Task 11: Configurator layout (stepper shell)

- **File**: `apps/web/app/product-configurator/layout.tsx`
- **Action**: CREATE
- **Implement**:

```tsx
import { Stepper } from '@/components/ui/stepper'
import { StepNavigation } from '@/components/ui/step-navigation'

export default function ConfiguratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink/10 px-6 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-ink/60 uppercase">
          Terrain Poster Configurator
        </h1>
      </header>
      <Stepper />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {children}
      </main>
      <StepNavigation />
    </div>
  )
}
```

- **Validate**: All 5 step routes show the stepper header and navigation footer

---

### Task 12: Step stub pages

- **Files**: `upload/page.tsx`, `map/page.tsx`, `preview/page.tsx`, `mockup/page.tsx`, `cart/page.tsx` (all under `apps/web/app/product-configurator/`)
- **Action**: CREATE
- **Implement**: Each stub exports a default Server Component with a placeholder. Pattern (repeat for each step with appropriate label):

```tsx
// upload/page.tsx
export default function UploadStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-ink/40 text-sm">Step: Upload GPX — TV-002</p>
    </div>
  )
}
```

Replace "Upload GPX — TV-002" with appropriate label per step:
- `map/page.tsx` → `2D Map Viewer — TV-007`
- `preview/page.tsx` → `3D Terrain Preview — TV-011`
- `mockup/page.tsx` → `Poster Mockup — TV-018`
- `cart/page.tsx` → `Add to Cart — TV-020`

Also create:
```tsx
// product-configurator/page.tsx
import { redirect } from 'next/navigation'
export default function ConfiguratorRoot() {
  redirect('/product-configurator/upload')
}
```

- **Validate**: Each route renders without 404; stepper highlights the correct active step

---

### Task 13: Environment variable template

- **File**: `.env.local.example`
- **Action**: CREATE
- **Implement**:

```env
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=
NEXT_PUBLIC_SHOPIFY_PRODUCT_ID=
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
GPX_STORAGE_BUCKET=
GPX_STORAGE_ACCESS_KEY=
GPX_STORAGE_SECRET_KEY=
NEXT_PUBLIC_MAP_TILE_URL=
```

- **Validate**: File committed; actual `.env.local` is in `.gitignore`

---

## Validation

```bash
# From project root
pnpm install

# Type check + build
pnpm run build

# Dev server
pnpm run dev

# Lint
pnpm run lint
```

Expected state after all tasks complete:
- `pnpm run build` exits 0 with zero TypeScript errors
- `pnpm run dev` starts; visiting `http://localhost:3000` redirects to `/product-configurator/upload`
- All 5 step routes render with stepper + navigation
- Stepper shows active step based on current URL
- Next button is disabled on Upload step until `gpxUrl` is set (TV-002 will set it)

---

## Acceptance Criteria

- [ ] Fresh clone → `pnpm install && pnpm run dev` → app starts without errors
- [ ] `/product-configurator/upload` shows 5-step stepper with step 1 active
- [ ] Navigating between routes updates active step in stepper
- [ ] `ConfiguratorState` type in `types/configurator.ts` matches PRD §6 exactly
- [ ] Zustand store `updateConfig` mutates state; components reactively re-render
- [ ] `pnpm run build` passes with `strict: true` and zero TypeScript errors
- [ ] `.env.local.example` present; `.env.local` excluded via `.gitignore`

---

## Risks

| Risk | Mitigation |
|---|---|
| Zustand + Next.js App Router hydration mismatch | Add `suppressHydrationWarning` to `<body>` if needed; avoid accessing Zustand store in Server Components |
| Stepper reads route vs. store state | Stepper reads `currentStep` from store; navigation actions update store + push route together in `StepNavigation` — both stay in sync |
| pnpm monorepo version conflicts | Pin all workspace packages to explicit versions in `apps/web/package.json` |
