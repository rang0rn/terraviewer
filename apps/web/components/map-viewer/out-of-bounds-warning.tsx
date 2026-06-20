'use client'

import { useMemo } from 'react'
import { useConfiguratorStore } from '@/lib/store/configurator'
import { generateShapeGeoJSON } from '@/features/map/shape-geojson'
import { isRouteOutOfBounds } from '@/features/map/out-of-bounds'

export function OutOfBoundsWarning() {
  const routeCoordinates = useConfiguratorStore((s) => s.routeCoordinates)
  const routeBounds = useConfiguratorStore((s) => s.routeBounds)
  const shape = useConfiguratorStore((s) => s.shape)

  const outOfBounds = useMemo(() => {
    if (!routeCoordinates || !routeBounds) return false
    return isRouteOutOfBounds(routeCoordinates, generateShapeGeoJSON(routeBounds, shape))
  }, [routeCoordinates, routeBounds, shape])

  if (!outOfBounds) return null

  return (
    <p
      role="alert"
      className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
    >
      Teile deiner Route liegen außerhalb der gewählten Ausschnittform und werden auf dem Poster abgeschnitten.
    </p>
  )
}
