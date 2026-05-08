export type StepId = 'upload' | 'map' | 'preview' | 'mockup' | 'cart'

export type RouteColor = 'orange' | 'green' | 'blue' | 'red' | 'white' | 'yellow' | 'black'
export type TerrainColor = 'gray' | 'black' | 'white'
export type Shape = 'circle' | 'hexagon'
export type ElevationScale = 1 | 2 | 3

export type RouteBounds = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export type PosterText = {
  name?: string
  event?: string
  date?: string
  time?: string
  distance?: string
  elevation?: string
  extra?: string
}

export type ConfiguratorState = {
  gpxUrl: string | null
  routeBounds: RouteBounds | null
  shape: Shape
  elevationScale: ElevationScale
  buildingsEnabled: boolean
  routeColor: RouteColor
  terrainColor: TerrainColor
  buildingColor: TerrainColor
  posterText: PosterText
}
