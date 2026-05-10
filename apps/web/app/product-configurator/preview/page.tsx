import { TerrainViewer } from '@/components/terrain-viewer/terrain-viewer'
import { RouteColorToggle } from '@/components/terrain-viewer/route-color-toggle'
import { TerrainColorToggle } from '@/components/terrain-viewer/terrain-color-toggle'
import { BuildingColorToggle } from '@/components/terrain-viewer/building-color-toggle'
import { ElevationScaleToggle } from '@/components/terrain-viewer/elevation-scale-toggle'
import { BuildingsToggle } from '@/components/terrain-viewer/buildings-toggle'

export default function PreviewStep() {
  return (
    <div className="py-6">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-ink">3D-Vorschau</h2>
        <p className="mt-1 text-sm text-ink/60">
          Rotiere das Modell mit der Maus oder per Touch-Geste.
        </p>
      </div>
      <div className="mb-4">
        <RouteColorToggle />
      </div>
      <div className="mb-4">
        <TerrainColorToggle />
      </div>
      <div className="mb-4">
        <BuildingColorToggle />
      </div>
      <div className="mb-4">
        <ElevationScaleToggle />
      </div>
      <div className="mb-4">
        <BuildingsToggle />
      </div>
      <TerrainViewer />
    </div>
  )
}
