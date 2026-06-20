import { describe, it, expect, beforeEach } from 'vitest'
import { useConfiguratorStore } from './configurator'

function resetStore() {
  useConfiguratorStore.setState({
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
    currentStep: 'upload',
    isTerrainLoading: false,
  })
}

describe('canAdvance', () => {
  beforeEach(resetStore)

  it('returns false on upload step when gpxUrl is null', () => {
    useConfiguratorStore.setState({ currentStep: 'upload', gpxUrl: null })
    expect(useConfiguratorStore.getState().canAdvance()).toBe(false)
  })

  it('returns true on upload step when gpxUrl is set', () => {
    useConfiguratorStore.setState({ currentStep: 'upload', gpxUrl: 'https://example.com/gpx.gpx' })
    expect(useConfiguratorStore.getState().canAdvance()).toBe(true)
  })

  it('returns false on preview step when terrain is loading', () => {
    useConfiguratorStore.setState({ currentStep: 'preview', isTerrainLoading: true })
    expect(useConfiguratorStore.getState().canAdvance()).toBe(false)
  })

  it('returns true on preview step when terrain is not loading', () => {
    useConfiguratorStore.setState({ currentStep: 'preview', isTerrainLoading: false })
    expect(useConfiguratorStore.getState().canAdvance()).toBe(true)
  })

  it('returns true on map step unconditionally', () => {
    useConfiguratorStore.setState({ currentStep: 'map' })
    expect(useConfiguratorStore.getState().canAdvance()).toBe(true)
  })

  it('returns true on mockup step unconditionally', () => {
    useConfiguratorStore.setState({ currentStep: 'mockup' })
    expect(useConfiguratorStore.getState().canAdvance()).toBe(true)
  })
})

describe('setTerrainLoading', () => {
  beforeEach(resetStore)

  it('sets isTerrainLoading to true', () => {
    useConfiguratorStore.getState().setTerrainLoading(true)
    expect(useConfiguratorStore.getState().isTerrainLoading).toBe(true)
  })

  it('sets isTerrainLoading back to false', () => {
    useConfiguratorStore.setState({ isTerrainLoading: true })
    useConfiguratorStore.getState().setTerrainLoading(false)
    expect(useConfiguratorStore.getState().isTerrainLoading).toBe(false)
  })
})
