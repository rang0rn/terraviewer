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
