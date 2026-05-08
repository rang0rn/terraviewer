import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import type { Feature, Polygon } from 'geojson'

export function isRouteOutOfBounds(
  coords: [number, number][],
  shapePoly: Feature<Polygon>,
): boolean {
  return coords.some((coord) => !booleanPointInPolygon(coord, shapePoly))
}
