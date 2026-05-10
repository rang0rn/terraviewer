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
      <div className="w-full max-w-xs border-[6px] border-ink/80 bg-white shadow-2xl">
        <div className="px-6 pt-6 pb-8">

          <div
            className="mx-auto aspect-square w-full overflow-hidden relative"
            style={{
              backgroundColor: terrainHex,
              borderRadius: isCircle ? '50%' : undefined,
              clipPath: isCircle ? undefined : HEXAGON_CLIP,
            }}
          >
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
