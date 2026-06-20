import type { RouteBounds } from '@/types/configurator'

export type UploadErrorCode =
  | 'NO_ELEVATION_DATA'
  | 'INVALID_GPX_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'INVALID_MIME_TYPE'
  | 'STORAGE_ERROR'
  | 'RATE_LIMIT_EXCEEDED'

export type UploadSuccessResponse = {
  success: true
  gpxUrl: string
  fileName: string
  hasElevation: boolean
  routeBounds: RouteBounds
}

export type UploadErrorResponse = {
  success: false
  errorCode: UploadErrorCode
  message: string
}

export type UploadResponse = UploadSuccessResponse | UploadErrorResponse
