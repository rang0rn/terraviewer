import { NextRequest, NextResponse } from 'next/server'
import { fetchTerrainGrid } from '@/lib/terrain/tile-fetch'
import { zoomForQuality, resolutionForQuality } from '@/lib/terrain/tile-math'
import type { TerrainApiResponse, TerrainQuality } from '@/types/terrain'
import type { RouteBounds } from '@/types/configurator'

const VALID_QUALITIES = new Set<string>(['mobile', 'preview', 'desktop'])

export async function GET(request: NextRequest): Promise<NextResponse<TerrainApiResponse>> {
  const { searchParams } = request.nextUrl
  const minLat = parseFloat(searchParams.get('minLat') ?? '')
  const maxLat = parseFloat(searchParams.get('maxLat') ?? '')
  const minLng = parseFloat(searchParams.get('minLng') ?? '')
  const maxLng = parseFloat(searchParams.get('maxLng') ?? '')
  const qualityParam = searchParams.get('quality') ?? 'preview'

  if ([minLat, maxLat, minLng, maxLng].some(isNaN)) {
    return NextResponse.json(
      { success: false, errorCode: 'MISSING_PARAMS', message: 'Fehlende oder ungültige Bounds-Parameter.' },
      { status: 400 }
    )
  }

  const quality: TerrainQuality = VALID_QUALITIES.has(qualityParam)
    ? (qualityParam as TerrainQuality)
    : 'preview'

  const bounds: RouteBounds = { minLat, maxLat, minLng, maxLng }
  const z = zoomForQuality(quality)
  const resolution = resolutionForQuality(quality)

  try {
    const { grid, minEle, maxEle } = await fetchTerrainGrid(bounds, resolution, z)
    return NextResponse.json({
      success: true,
      terrain: { grid, resolution, minEle, maxEle },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('[terrain/data]', message)
    return NextResponse.json(
      { success: false, errorCode: 'TERRAIN_FETCH_ERROR', message: 'Geländedaten konnten nicht geladen werden.' },
      { status: 502 }
    )
  }
}
