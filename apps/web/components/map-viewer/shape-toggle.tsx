'use client'

import { useConfiguratorStore } from '@/lib/store/configurator'
import type { Shape } from '@/types/configurator'

const LABELS: Record<Shape, string> = {
  circle: 'Kreis',
  hexagon: 'Hexagon',
}

export function ShapeToggle() {
  const shape = useConfiguratorStore((s) => s.shape)
  const { updateConfig } = useConfiguratorStore()

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
