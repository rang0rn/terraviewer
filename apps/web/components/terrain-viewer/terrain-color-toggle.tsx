'use client'

import { useConfiguratorStore } from '@/lib/store/configurator'
import type { TerrainColor } from '@/types/configurator'

const LABELS: Record<TerrainColor, string> = {
  gray: 'Grau',
  black: 'Schwarz',
  white: 'Weiß',
}

export function TerrainColorToggle() {
  const terrainColor = useConfiguratorStore((s) => s.terrainColor)
  const { updateConfig } = useConfiguratorStore()

  return (
    <div className="flex justify-center gap-2">
      {(['gray', 'black', 'white'] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => updateConfig('terrainColor', c)}
          className={[
            'rounded px-5 py-2 text-sm font-medium transition-colors',
            terrainColor === c
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
