import { TerrainViewer } from '@/components/terrain-viewer/terrain-viewer'

export default function PreviewStep() {
  return (
    <div className="py-6">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-ink">3D-Vorschau</h2>
        <p className="mt-1 text-sm text-ink/60">
          Rotiere das Modell mit der Maus oder per Touch-Geste.
        </p>
      </div>
      <TerrainViewer />
    </div>
  )
}
