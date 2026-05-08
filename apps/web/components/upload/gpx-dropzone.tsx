'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfiguratorStore } from '@/lib/store/configurator'
import { validateGpxFile } from '@/features/gpx/validate-client'
import type { UploadResponse } from '@/types/upload'

type UploadState = 'idle' | 'dragging' | 'uploading' | 'error'

export function GpxDropzone() {
  const router = useRouter()
  const { updateConfig, advanceStep } = useConfiguratorStore()
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const validationError = validateGpxFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      setUploadState('error')
      return
    }

    setUploadState('uploading')
    setErrorMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/gpx/upload', { method: 'POST', body: formData })
      const data: UploadResponse = await res.json()

      if (!data.success) {
        setErrorMessage(data.message)
        setUploadState('error')
        return
      }

      updateConfig('gpxUrl', data.gpxUrl)
      updateConfig('routeBounds', data.routeBounds)
      advanceStep()
      router.push('/product-configurator/map')
    } catch {
      setErrorMessage('Upload fehlgeschlagen. Bitte versuche es erneut.')
      setUploadState('error')
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setUploadState('idle')
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const isUploading = uploadState === 'uploading'

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <p className="text-xs text-ink/40 text-center">
        Deine GPX-Datei wird ausschließlich zur Erstellung deines Posters verwendet und sicher gespeichert.{' '}
        <a href="/datenschutz" className="underline hover:text-ink/60">
          Datenschutzhinweis
        </a>
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="GPX-Datei hochladen"
        onDragOver={(e) => { e.preventDefault(); setUploadState('dragging') }}
        onDragLeave={() => setUploadState('idle')}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        className={[
          'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors cursor-pointer',
          uploadState === 'dragging' ? 'border-ink bg-ink/5' : 'border-ink/20 hover:border-ink/40',
          isUploading ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        {isUploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
            <p className="text-sm text-ink/60">Datei wird hochgeladen…</p>
          </>
        ) : (
          <>
            <svg className="h-10 w-10 text-ink/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div>
              <p className="text-sm font-medium text-ink">GPX-Datei hierher ziehen</p>
              <p className="mt-1 text-xs text-ink/40">oder</p>
            </div>
            <button
              type="button"
              className="rounded bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-ink/80"
            >
              Datei auswählen
            </button>
            <p className="text-xs text-ink/40">Nur .gpx-Dateien, max. 10 MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        className="sr-only"
        onChange={onInputChange}
        aria-hidden="true"
      />

      {uploadState === 'error' && errorMessage && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
