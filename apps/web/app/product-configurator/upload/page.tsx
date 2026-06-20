import { GpxDropzone } from '@/components/upload/gpx-dropzone'

export default function UploadStep() {
  return (
    <div className="py-8">
      <div className="mb-8 text-center">
        <h2 className="text-lg font-semibold text-ink">GPX-Datei hochladen</h2>
        <p className="mt-1 text-sm text-ink/60">
          Exportiere deine Route aus Komoot, Garmin oder Strava als .gpx-Datei und lade sie hier hoch.
        </p>
      </div>
      <GpxDropzone />
    </div>
  )
}
