export type TerrainQuality = 'mobile' | 'preview' | 'desktop'

export type TerrainData = {
  grid: number[][]   // [res][res], grid[0][0] = NW corner (maxLat, minLng)
  resolution: number
  minEle: number
  maxEle: number
}

export type TerrainApiResponse =
  | { success: true; terrain: TerrainData }
  | { success: false; errorCode: string; message: string }
