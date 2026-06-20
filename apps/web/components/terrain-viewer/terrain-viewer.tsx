'use client'

import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { detectWebGL2 } from '@/lib/webgl/detect-webgl2'
import { detectDeviceQuality, isMobileDevice } from '@/lib/geometry/deviceQuality'
import { useConfiguratorStore } from '@/lib/store/configurator'
import { TerrainMesh } from './terrain-mesh'
import { BuildingsMesh } from './buildings-mesh'
import type { TerrainData, BuildingFeature } from '@/types/terrain'
import type { RouteBounds } from '@/types/configurator'

// 35% padding ensures route's tight bounding box maps to ~0.59 normalized,
// so even the worst-case corners (0.59*sqrt(2)≈0.83) fit within the circle/hexagon.
const PAD_FACTOR = 0.35

function padBounds(b: RouteBounds): RouteBounds {
  const latSpan = b.maxLat - b.minLat
  const lngSpan = b.maxLng - b.minLng
  return {
    minLat: b.minLat - latSpan * PAD_FACTOR,
    maxLat: b.maxLat + latSpan * PAD_FACTOR,
    minLng: b.minLng - lngSpan * PAD_FACTOR,
    maxLng: b.maxLng + lngSpan * PAD_FACTOR,
  }
}


function Scene({
  terrain,
  terrainBounds,
  buildings,
  buildingsEnabled,
}: {
  terrain: TerrainData
  terrainBounds: RouteBounds
  buildings: BuildingFeature[] | null
  buildingsEnabled: boolean
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 8, 4]} intensity={1.2} castShadow={false} />
      <directionalLight position={[-4, 6, -4]} intensity={0.4} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2 + 0.3}
      />
      <TerrainMesh terrain={terrain} terrainBounds={terrainBounds} />
      {buildingsEnabled && buildings && buildings.length > 0 && (
        <BuildingsMesh buildings={buildings} terrainBounds={terrainBounds} terrain={terrain} />
      )}
    </>
  )
}

export function TerrainViewer() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)
  const [terrain, setTerrain] = useState<TerrainData | null>(null)
  const [terrainBounds, setTerrainBounds] = useState<RouteBounds | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buildings, setBuildings] = useState<BuildingFeature[] | null>(null)
  const [buildingsLoading, setBuildingsLoading] = useState(false)
  const [canvasVisible, setCanvasVisible] = useState(false)
  const mobileDpr = useMemo<[number, number]>(() => (isMobileDevice() ? [1, 1.5] : [1, 2]), [])
  const routeBounds = useConfiguratorStore((s) => s.routeBounds)
  const buildingsEnabled = useConfiguratorStore((s) => s.buildingsEnabled)
  const shape = useConfiguratorStore((s) => s.shape)
  const { setTerrainLoading } = useConfiguratorStore()

  useEffect(() => {
    setWebglSupported(detectWebGL2())
  }, [])

  useEffect(() => {
    if (!routeBounds) return
    const padded = padBounds(routeBounds)
    const quality = detectDeviceQuality()
    const params = new URLSearchParams({
      minLat: String(padded.minLat),
      maxLat: String(padded.maxLat),
      minLng: String(padded.minLng),
      maxLng: String(padded.maxLng),
      quality,
    })

    setTerrainLoading(true)
    fetch(`/api/terrain/data?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTerrain(data.terrain)
          setTerrainBounds(padded)
        } else {
          setError('Geländedaten konnten nicht geladen werden.')
        }
      })
      .catch(() => {
        setError('Geländedaten konnten nicht geladen werden.')
      })
      .finally(() => setTerrainLoading(false))
  }, [routeBounds, setTerrainLoading])

  // Reset buildings cache when a new GPX is uploaded
  useEffect(() => {
    setBuildings(null)
  }, [routeBounds])

  // Fade-in: trigger opacity transition after terrain first arrives
  useEffect(() => {
    if (terrain) setCanvasVisible(true)
  }, [terrain])

  // Lazy-fetch buildings when enabled for the first time (cache in local state)
  useEffect(() => {
    if (!buildingsEnabled || !terrainBounds) return
    if (buildings !== null) return
    setBuildingsLoading(true)
    const { minLat, maxLat, minLng, maxLng } = terrainBounds
    const params = new URLSearchParams({
      minLat: String(minLat),
      maxLat: String(maxLat),
      minLng: String(minLng),
      maxLng: String(maxLng),
      buildings: 'true',
    })
    fetch(`/api/terrain/data?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setBuildings(data.terrain.buildings ?? [])
      })
      .catch(() => setBuildings([]))
      .finally(() => setBuildingsLoading(false))
  }, [buildingsEnabled, terrainBounds, buildings])

  if (webglSupported === null || (routeBounds && !terrain && !error)) {
    return (
      <div className="h-[480px] w-full rounded-xl bg-ink/5 flex flex-col items-center justify-center gap-4">
        <div
          className="w-3/4 aspect-square max-w-xs bg-ink/10 animate-pulse"
          style={
            shape === 'hexagon'
              ? { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }
              : { borderRadius: '50%' }
          }
        />
        <p className="text-sm text-ink/40 animate-pulse">Laden…</p>
      </div>
    )
  }

  if (!webglSupported) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
        Dein Browser unterstützt WebGL nicht. Bitte versuche einen anderen Browser.
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
        {error}
      </div>
    )
  }

  if (!terrain || !terrainBounds) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
        Keine GPX-Daten vorhanden.
      </div>
    )
  }

  return (
    <>
      <div className={`h-[480px] w-full rounded-xl overflow-hidden transition-opacity duration-200 ${canvasVisible ? 'opacity-100' : 'opacity-0'}`}>
        <Canvas
          dpr={mobileDpr}
          frameloop="demand"
          camera={{ position: [0, 3, 5], fov: 45 }}
        >
          <Scene
            terrain={terrain}
            terrainBounds={terrainBounds}
            buildings={buildings}
            buildingsEnabled={buildingsEnabled}
          />
        </Canvas>
      </div>
      {buildingsEnabled && !buildingsLoading && buildings !== null && buildings.length === 0 && (
        <p className="mt-2 text-center text-xs text-ink/40">
          Für dieses Gebiet sind keine Gebäudedaten verfügbar.
        </p>
      )}
    </>
  )
}
