import { Stepper } from '@/components/ui/stepper'
import { StepNavigation } from '@/components/ui/step-navigation'

export default function ConfiguratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink/10 px-6 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-ink/60 uppercase">
          Terrain Poster Configurator
        </h1>
      </header>
      <Stepper />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {children}
      </main>
      <StepNavigation />
    </div>
  )
}
