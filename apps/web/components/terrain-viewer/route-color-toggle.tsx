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
