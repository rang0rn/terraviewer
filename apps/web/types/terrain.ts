export type TerrainQuality = 'mobile' | 'preview' | 'desktop'

export type BuildingFeature = {
  footprint: [number, number][]  // [lng, lat] pairs, closed polygon (first === last)
  height: number                 // metres; default 10 when OSM tag absent
}

export type TerrainData = {
  grid: number[][]   // [res][res], grid[0][0] = NW corner (maxLat, minLng)
  resolution: number
  minEle: number
  maxEle: number
  buildings?: BuildingFeature[]  // present only when ?buildings=true was requested
}

export type TerrainApiResponse =
  | { success: true; terrain: TerrainData }
  | { success: false; errorCode: string; message: string }
