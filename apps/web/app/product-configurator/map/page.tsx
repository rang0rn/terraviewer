import { MapViewer } from '@/components/map-viewer/map-viewer'
import { ShapeToggle } from '@/components/map-viewer/shape-toggle'

export default function MapStep() {
  return (
    <div className="py-6">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-ink">Route prüfen</h2>
        <p className="mt-1 text-sm text-ink/60">
          Prüfe deine Route und wähle die gewünschte Ausschnittform.
        </p>
      </div>
      <div className="mb-4">
        <ShapeToggle />
      </div>
      <MapViewer />
    </div>
  )
}
