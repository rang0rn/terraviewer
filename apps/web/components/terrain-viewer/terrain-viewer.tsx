'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { detectWebGL2 } from '@/lib/webgl/detect-webgl2'
import { useConfiguratorStore } from '@/lib/store/configurator'
import { TerrainMesh } from './terrain-mesh'
import type { TerrainData } from '@/types/terrain'
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

function detectQuality(): 'mobile' | 'preview' {
  if (typeof window === 'undefined') return 'preview'
  return window.innerWidth < 768 ? 'mobile' : 'preview'
}

function Scene({ terrain, terrainBounds }: { terrain: TerrainData; terrainBounds: RouteBounds }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 8, 4]} intensity={1.2} castShadow={false} />
      <directionalLight position={[-4, 6, -4]} intensity={0.4} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={2}
        maxDistance={10}
      />
      <TerrainMesh terrain={terrain} terrainBounds={terrainBounds} />
    </>
  )
}

export function TerrainViewer() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)
  const [terrain, setTerrain] = useState<TerrainData | null>(null)
  const [terrainBounds, setTerrainBounds] = useState<RouteBounds | null>(null)
  const [error, setError] = useState<string | null>(null)
  const routeBounds = useConfiguratorStore((s) => s.routeBounds)

  useEffect(() => {
    setWebglSupported(detectWebGL2())
  }, [])

  useEffect(() => {
    if (!routeBounds) return
    const padded = padBounds(routeBounds)
    const quality = detectQuality()
    const params = new URLSearchParams({
      minLat: String(padded.minLat),
      maxLat: String(padded.maxLat),
      minLng: String(padded.minLng),
      maxLng: String(padded.maxLng),
      quality,
    })

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
  }, [routeBounds])

  if (webglSupported === null || (routeBounds && !terrain && !error)) {
    return <div className="h-[480px] w-full rounded-xl bg-ink/5 animate-pulse" />
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
    <div className="h-[480px] w-full rounded-xl overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ position: [0, 3, 5], fov: 45 }}
      >
        <Scene terrain={terrain} terrainBounds={terrainBounds} />
      </Canvas>
    </div>
  )
}
