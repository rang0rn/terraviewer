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
