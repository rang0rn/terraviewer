import { PosterMockup } from '@/components/poster-mockup/poster-mockup'

export default function MockupStep() {
  return (
    <div className="py-6">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-ink">Poster-Vorschau</h2>
        <p className="mt-1 text-sm text-ink/60">So wird dein Poster aussehen.</p>
      </div>
      <PosterMockup />
    </div>
  )
}
