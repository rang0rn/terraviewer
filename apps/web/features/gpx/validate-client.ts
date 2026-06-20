const MAX_FILE_SIZE = 10 * 1024 * 1024

export function validateGpxFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.gpx')) {
    return 'Nur .gpx-Dateien werden akzeptiert.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Datei zu groß (maximal 10 MB).'
  }
  return null
}
