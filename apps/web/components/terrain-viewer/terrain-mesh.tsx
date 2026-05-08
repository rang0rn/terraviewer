'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useConfiguratorStore } from '@/lib/store/configurator'
import type { TerrainData } from '@/types/terrain'
import type { RouteBounds } from '@/types/configurator'

const ELEVATION_SCALE: Record<number, number> = { 1: 0.4, 2: 0.7, 3: 1.1 }
// Sockel uses BoxGeometry(SOCKEL_BOX, SOCKEL_HEIGHT, SOCKEL_BOX) so it fully
// covers the 2×2 PlaneGeometry including corners (max radius = sqrt(2) ≈ 1.41).
const SOCKEL_HEIGHT = 0.14
const SOCKEL_BOX = 2.05
const ROUTE_TUBE_RADIUS = 0.015
const MAX_ROUTE_POINTS = 200

const TERRAIN_COLOR: Record<string, string> = {
  gray: '#888888',
  black: '#1a1a1a',
  white: '#f5f5f5',
}

const ROUTE_COLOR: Record<string, string> = {
  orange: '#ff6b35',
  green: '#4caf50',
  blue: '#2196f3',
  red: '#f44336',
  white: '#ffffff',
  yellow: '#ffeb3b',
  black: '#1a1a1a',
}

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

function subsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr
  const step = arr.length / maxPoints
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.floor(i * step)])
}

export function TerrainMesh({
  terrain,
  terrainBounds,
}: {
  terrain: TerrainData
  terrainBounds: RouteBounds
}) {
  const { shape, elevationScale, terrainColor, routeColor, routeCoordinates } =
    useConfiguratorStore()
  const geoRef = useRef<THREE.PlaneGeometry>(null)
  const { invalidate } = useThree()

  const res = terrain.resolution
  const eleRange = terrain.maxEle - terrain.minEle || 1
  const scaleFactor = ELEVATION_SCALE[elevationScale] ?? 0.4
  const inShape = shape === 'circle' ? isInCircle : isInHexagon

  useEffect(() => {
    const geo = geoRef.current
    if (!geo) return
    const pos = geo.attributes.position as THREE.BufferAttribute

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const vi = i * res + j
        // nx: -1 (west/minLng) → +1 (east/maxLng)
        // nz: -1 (north/maxLat) → +1 (south/minLat)
        const nx = (j / (res - 1)) * 2 - 1
        const nz = (i / (res - 1)) * 2 - 1
        const ele = terrain.grid[i][j]
        // Masked vertices go to the center of the box sockel — fully hidden inside
        // the BoxGeometry(SOCKEL_BOX × SOCKEL_HEIGHT × SOCKEL_BOX) which covers all
        // PlaneGeometry corners (max radius sqrt(2) < SOCKEL_BOX/2 = 1.025).
        const h = inShape(nx, nz)
          ? ((ele - terrain.minEle) / eleRange) * scaleFactor
          : -(SOCKEL_HEIGHT * 0.5)

        pos.setZ(vi, h)
      }
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
    invalidate()
  }, [terrain, shape, elevationScale, res, eleRange, scaleFactor, inShape, invalidate])

  const routeTubeGeometry = useMemo(() => {
    if (!routeCoordinates) return null
    const { minLat, maxLat, minLng, maxLng } = terrainBounds
    const sampled = subsample(routeCoordinates, MAX_ROUTE_POINTS)

    const points = sampled.map(([lng, lat]) => {
      // Map using terrainBounds (the padded bounds used to fetch the terrain grid),
      // so the route aligns correctly with the terrain vertex positions.
      const nx = -1 + ((lng - minLng) / (maxLng - minLng)) * 2
      const nz = -1 + ((maxLat - lat) / (maxLat - minLat)) * 2

      // Sample nearest grid cell for terrain height under the route
      const gi = Math.max(0, Math.min(res - 1, Math.round(((maxLat - lat) / (maxLat - minLat)) * (res - 1))))
      const gj = Math.max(0, Math.min(res - 1, Math.round(((lng - minLng) / (maxLng - minLng)) * (res - 1))))
      const ele = terrain.grid[gi]?.[gj] ?? terrain.minEle
      const h = inShape(nx, nz)
        ? ((ele - terrain.minEle) / eleRange) * scaleFactor + ROUTE_TUBE_RADIUS
        : -(SOCKEL_HEIGHT * 0.5)  // route points outside shape sink into sockel

      return new THREE.Vector3(nx, h, nz)
    })

    if (points.length < 2) return null
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, sampled.length * 2, ROUTE_TUBE_RADIUS, 6, false)
  }, [routeCoordinates, terrainBounds, terrain, res, eleRange, scaleFactor, inShape])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry ref={geoRef} args={[2, 2, res - 1, res - 1]} />
        <meshStandardMaterial
          color={TERRAIN_COLOR[terrainColor] ?? '#888888'}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* BoxGeometry sockel covers the full PlaneGeometry footprint including corners */}
      <mesh position={[0, -SOCKEL_HEIGHT / 2, 0]}>
        <boxGeometry args={[SOCKEL_BOX, SOCKEL_HEIGHT, SOCKEL_BOX]} />
        <meshStandardMaterial color={TERRAIN_COLOR[terrainColor] ?? '#888888'} />
      </mesh>

      {routeTubeGeometry && (
        <mesh geometry={routeTubeGeometry}>
          <meshStandardMaterial color={ROUTE_COLOR[routeColor] ?? '#ff6b35'} />
        </mesh>
      )}
    </group>
  )
}
