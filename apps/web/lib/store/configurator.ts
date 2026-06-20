'use client'

import { create } from 'zustand'
import type { ConfiguratorState, StepId } from '@/types/configurator'

const STEP_ORDER: StepId[] = ['upload', 'map', 'preview', 'mockup', 'cart']

const DEFAULT_STATE: ConfiguratorState = {
  gpxUrl: null,
  routeBounds: null,
  routeCoordinates: null,
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
  isTerrainLoading: boolean
  updateConfig: <K extends keyof ConfiguratorState>(key: K, value: ConfiguratorState[K]) => void
  advanceStep: () => void
  retreatStep: () => void
  canAdvance: () => boolean
  setTerrainLoading: (v: boolean) => void
}

export const useConfiguratorStore = create<ConfiguratorStore>((set, get) => ({
  ...DEFAULT_STATE,
  currentStep: 'upload',
  isTerrainLoading: false,

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

  canAdvance: () => {
    const { currentStep, gpxUrl, isTerrainLoading } = get()
    if (currentStep === 'upload') return gpxUrl !== null
    if (currentStep === 'preview') return !isTerrainLoading
    return true
  },

  setTerrainLoading: (v) => set({ isTerrainLoading: v }),
}))
