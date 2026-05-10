'use client'

import { useConfiguratorStore } from '@/lib/store/configurator'

export function BuildingsToggle() {
  const buildingsEnabled = useConfiguratorStore((s) => s.buildingsEnabled)
  const { updateConfig } = useConfiguratorStore()

  return (
    <div className="flex justify-center gap-2">
      {([false, true] as const).map((on) => (
        <button
          key={String(on)}
          type="button"
          onClick={() => updateConfig('buildingsEnabled', on)}
          className={[
            'rounded px-5 py-2 text-sm font-medium transition-colors',
            buildingsEnabled === on
              ? 'bg-ink text-white'
              : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink',
          ].join(' ')}
        >
          {on ? 'Mit Gebäuden' : 'Ohne Gebäude'}
        </button>
      ))}
    </div>
  )
}
