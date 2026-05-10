'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { isMobileDevice } from '@/lib/geometry/deviceQuality'
import { useConfiguratorStore } from '@/lib/store/configurator'
import type { BuildingFeature, TerrainData } from '@/types/terrain'
import type { RouteBounds } from '@/types/configurator'

const MOBILE_BUILDINGS_LIMIT = 50

function footprintArea(footprint: [number, number][]): number {
  let area = 0
  const n = footprint.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = footprint[i]
    const [x2, y2] = footprint[(i + 1) % n]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}

const BUILDING_COLOR: Record<string, string> = {
  gray: '#888888',
  black: '#1a1a1a',
  white: '#f5f5f5',
}

const ELEVATION_SCALE: Record<number, number> = { 1: 0.18, 2: 0.32, 3: 0.5 }
const BUILDING_HEIGHT_SCALE = 0.003

function isInCircle(nx: number, nz: number): boolean {
  return nx * nx + nz * nz <= 1
}

function isInHexagon(nx: number, nz: number): boolean {
  const sqrt3 = Math.sqrt(3)
  return (
    Math.abs(nz) <= sqrt3 / 2 &&
    Math.abs(nz + nx * sqrt3) <= sqrt3 &&
    Math.abs(nz - nx * sqrt3) <= sqrt3
  )
}

export function BuildingsMesh({
  buildings,
  terrainBounds,
  terrain,
}: {
  buildings: BuildingFeature[]
  terrainBounds: RouteBounds
  terrain: TerrainData
}) {
  const { buildingColor, elevationScale, shape } = useConfiguratorStore()
  const scaleFactor = ELEVATION_SCALE[elevationScale] ?? 0.4
  const eleRange = terrain.maxEle - terrain.minEle || 1
  const inShape = shape === 'circle' ? isInCircle : isInHexagon

  const effectiveBuildings = useMemo(() => {
    if (!isMobileDevice() || buildings.length <= MOBILE_BUILDINGS_LIMIT) return buildings
    return [...buildings]
      .sort((a, b) => footprintArea(b.footprint) - footprintArea(a.footprint))
      .slice(0, MOBILE_BUILDINGS_LIMIT)
  }, [buildings])

  const meshData = useMemo(() => {
    const { minLat, maxLat, minLng, maxLng } = terrainBounds
    const res = terrain.resolution

    return effectiveBuildings.flatMap((building) => {
      const centLng =
        building.footprint.reduce((s, [lng]) => s + lng, 0) / building.footprint.length
      const centLat =
        building.footprint.reduce((s, [, lat]) => s + lat, 0) / building.footprint.length

      const cx = -1 + ((centLng - minLng) / (maxLng - minLng)) * 2
      const cz = -1 + ((maxLat - centLat) / (maxLat - minLat)) * 2

      if (!inShape(cx, cz)) return []

      const gi = Math.max(
        0,
        Math.min(res - 1, Math.round(((maxLat - centLat) / (maxLat - minLat)) * (res - 1)))
      )
      const gj = Math.max(
        0,
        Math.min(res - 1, Math.round(((centLng - minLng) / (maxLng - minLng)) * (res - 1)))
      )
      const ele = terrain.grid[gi]?.[gj] ?? terrain.minEle
      const baseH = ((ele - terrain.minEle) / eleRange) * scaleFactor

      const pts = building.footprint.map(
        ([lng, lat]) =>
          new THREE.Vector2(
            -1 + ((lng - minLng) / (maxLng - minLng)) * 2,
            -(-1 + ((maxLat - lat) / (maxLat - minLat)) * 2)
          )
      )

      const threeShape = new THREE.Shape(pts)
      const depth = Math.max(building.height, 3) * BUILDING_HEIGHT_SCALE
      const geometry = new THREE.ExtrudeGeometry(threeShape, { depth, bevelEnabled: false })

      return [{ geometry, baseH }]
    })
  }, [effectiveBuildings, terrainBounds, terrain, scaleFactor, eleRange, inShape])

  const color = BUILDING_COLOR[buildingColor] ?? '#888888'

  return (
    <>
      {meshData.map(({ geometry, baseH }, i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[0, baseH, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
        </mesh>
      ))}
    </>
  )
}
