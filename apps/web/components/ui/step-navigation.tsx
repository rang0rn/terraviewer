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
