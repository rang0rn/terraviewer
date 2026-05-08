import { NextRequest, NextResponse } from 'next/server'
import { parseGpx } from '@/lib/gpx/parser'
import { getStorageAdapter } from '@/lib/storage/get-storage'
import { checkRateLimit } from '@/lib/upload/rate-limit'
import type { UploadResponse } from '@/types/upload'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['application/gpx+xml', 'text/xml', 'application/xml', 'application/octet-stream']

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Zu viele Anfragen. Bitte warte eine Minute.' },
      { status: 429 }
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_MIME_TYPE', message: 'Ungültiges Dateiformat.' },
      { status: 400 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_GPX_FORMAT', message: 'Datei konnte nicht gelesen werden.' },
      { status: 400 }
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_GPX_FORMAT', message: 'Keine Datei gefunden.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, errorCode: 'FILE_TOO_LARGE', message: 'Datei zu groß. Maximal 10 MB erlaubt.' },
      { status: 413 }
    )
  }

  if (!file.name.toLowerCase().endsWith('.gpx')) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_MIME_TYPE', message: 'Nur .gpx-Dateien werden akzeptiert.' },
      { status: 400 }
    )
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_MIME_TYPE', message: 'Ungültiger Dateityp. Nur .gpx-Dateien erlaubt.' },
      { status: 400 }
    )
  }

  const text = await file.text()
  let parsed
  try {
    parsed = parseGpx(text)
  } catch (err) {
    const code = err instanceof Error ? err.message : 'INVALID_GPX_FORMAT'
    if (code === 'NO_ELEVATION_DATA') {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'NO_ELEVATION_DATA',
          message: 'Deine GPX-Datei enthält keine Höhenwerte. Bitte lade eine GPX-Datei mit Höheninformationen hoch.',
        },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_GPX_FORMAT', message: 'Die GPX-Datei konnte nicht gelesen werden. Bitte prüfe das Dateiformat.' },
      { status: 422 }
    )
  }

  if (!parsed.hasElevation) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'NO_ELEVATION_DATA',
        message: 'Deine GPX-Datei enthält keine Höhenwerte. Bitte lade eine GPX-Datei mit Höheninformationen hoch.',
      },
      { status: 422 }
    )
  }

  const key = `gpx/${crypto.randomUUID()}.gpx`
  let gpxUrl: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const storage = getStorageAdapter()
    gpxUrl = await storage.upload(key, buffer, 'application/gpx+xml')
  } catch {
    return NextResponse.json(
      { success: false, errorCode: 'STORAGE_ERROR', message: 'Datei konnte nicht gespeichert werden. Bitte versuche es erneut.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    gpxUrl,
    fileName: file.name,
    hasElevation: true,
    routeBounds: parsed.routeBounds,
  })
}
