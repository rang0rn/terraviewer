'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useConfiguratorStore } from '@/lib/store/configurator'
import type { TerrainData } from '@/types/terrain'
import type { RouteBounds } from '@/types/configurator'

const ELEVATION_SCALE: Record<number, number> = { 1: 0.18, 2: 0.32, 3: 0.5 }
const SOCKEL_HEIGHT = 0.14
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

function projectToCircle(nx: number, nz: number): [number, number] {
  const r = Math.sqrt(nx * nx + nz * nz)
  return [nx / r, nz / r]
}

// Scale (nx, nz) down to the nearest point on the hexagon boundary.
function projectToHexagon(nx: number, nz: number): [number, number] {
  const sqrt3 = Math.sqrt(3)
  let s = Infinity
  const absNz = Math.abs(nz)
  const absSum = Math.abs(nz + nx * sqrt3)
  const absDiff = Math.abs(nz - nx * sqrt3)
  if (absNz > 0) s = Math.min(s, (sqrt3 / 2) / absNz)
  if (absSum > 0) s = Math.min(s, sqrt3 / absSum)
  if (absDiff > 0) s = Math.min(s, sqrt3 / absDiff)
  return [nx * s, nz * s]
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
  const projectToShape = shape === 'circle' ? projectToCircle : projectToHexagon

  useEffect(() => {
    const geo = geoRef.current
    if (!geo) return
    const pos = geo.attributes.position as THREE.BufferAttribute

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const vi = i * res + j
        const nx = (j / (res - 1)) * 2 - 1
        const nz = (i / (res - 1)) * 2 - 1

        if (inShape(nx, nz)) {
          const ele = terrain.grid[i][j]
          pos.setX(vi, nx)
          pos.setY(vi, -nz)
          pos.setZ(vi, ((ele - terrain.minEle) / eleRange) * scaleFactor)
        } else {
          // Project exterior vertices onto the shape boundary at y=0.
          // Boundary-straddling triangles become the closed side walls; fully-exterior
          // triangles collapse to hairline slivers on the boundary and are invisible.
          const [px, pz] = projectToShape(nx, nz)
          pos.setX(vi, px)
          pos.setY(vi, -pz)
          pos.setZ(vi, 0)
        }
      }
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
    invalidate()
  }, [terrain, shape, elevationScale, res, eleRange, scaleFactor, inShape, projectToShape, invalidate])

  const routeTubeGeometry = useMemo(() => {
    if (!routeCoordinates) return null
    const { minLat, maxLat, minLng, maxLng } = terrainBounds
    const sampled = subsample(routeCoordinates, MAX_ROUTE_POINTS)

    const points = sampled.map(([lng, lat]) => {
      const nx = -1 + ((lng - minLng) / (maxLng - minLng)) * 2
      const nz = -1 + ((maxLat - lat) / (maxLat - minLat)) * 2

      if (!inShape(nx, nz)) {
        const [px, pz] = projectToShape(nx, nz)
        return new THREE.Vector3(px, 0, pz)
      }

      const gi = Math.max(0, Math.min(res - 1, Math.round(((maxLat - lat) / (maxLat - minLat)) * (res - 1))))
      const gj = Math.max(0, Math.min(res - 1, Math.round(((lng - minLng) / (maxLng - minLng)) * (res - 1))))
      const ele = terrain.grid[gi]?.[gj] ?? terrain.minEle
      const h = ((ele - terrain.minEle) / eleRange) * scaleFactor + ROUTE_TUBE_RADIUS

      return new THREE.Vector3(nx, h, nz)
    })

    if (points.length < 2) return null
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, sampled.length * 2, ROUTE_TUBE_RADIUS, 6, false)
  }, [routeCoordinates, terrainBounds, terrain, res, eleRange, scaleFactor, inShape, projectToShape])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry ref={geoRef} args={[2, 2, res - 1, res - 1]} />
        <meshStandardMaterial
          color={TERRAIN_COLOR[terrainColor] ?? '#888888'}
          roughness={0.85}
          metalness={0}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Three.js CylinderGeometry(6) starts its first vertex along +Z; isInHexagon has vertices on ±X → rotate 90° to align. */}
      <mesh position={[0, -SOCKEL_HEIGHT / 2, 0]} rotation={[0, shape === 'hexagon' ? Math.PI / 2 : 0, 0]}>
        <cylinderGeometry args={[1, 1, SOCKEL_HEIGHT, shape === 'circle' ? 64 : 6]} />
        <meshStandardMaterial color={TERRAIN_COLOR[terrainColor] ?? '#888888'} roughness={0.85} metalness={0} />
      </mesh>

      {routeTubeGeometry && (
        <mesh geometry={routeTubeGeometry}>
          <meshStandardMaterial color={ROUTE_COLOR[routeColor] ?? '#ff6b35'} roughness={0.75} metalness={0} />
        </mesh>
      )}
    </group>
  )
}
