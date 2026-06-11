'use client'

/**
 * <SectionCv /> — gère le CV (PDF) au profil :
 * - Affiche le CV s'il existe (lien "Voir mon CV" → proxy privé GUIC-364)
 * - Upload / remplace via POST `/api/upload/cv`
 * - Validation magic-bytes PDF côté client (pattern GUIC-241)
 *
 * GUIC-360 + GUIC-364.
 */

import { useRef, useState } from 'react'
import { Card } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'

const MAX_CV_BYTES = 10 * 1024 * 1024

function isPdf(head: Uint8Array): boolean {
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46
}

interface Props {
  initialCvUrl: string | null
  initialUploadedAt: string | null
  onUploaded?: (cvUrl: string) => void
}

export function SectionCv({ initialCvUrl, initialUploadedAt, onUploaded }: Props) {
  const [cvUrl, setCvUrl] = useState<string | null>(initialCvUrl)
  const [uploadedAt, setUploadedAt] = useState<string | null>(initialUploadedAt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (file.type !== 'application/pdf') {
      setError('Format invalide (PDF uniquement).')
      return
    }
    if (file.size > MAX_CV_BYTES) {
      setError('Fichier trop volumineux (10 MB max).')
      return
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    if (!isPdf(head)) {
      setError("Le contenu du fichier ne correspond pas à un PDF.")
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/cv', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload impossible')
      const newUrl: string = json.data?.cvUrl ?? json.cvUrl
      setCvUrl(newUrl)
      setUploadedAt(new Date().toISOString())
      onUploaded?.(newUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-3">
        Curriculum Vitae
      </h2>

      {cvUrl ? (
        <div className="flex flex-col gap-space-2">
          <div className="flex items-center gap-space-2 flex-wrap">
            <Icon name="document" size={18} style={{ color: 'var(--gj-teal-deep)' }} />
            <a
              href="/api/profil/cv/file"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fs-300 font-bold text-gj-teal-deep underline underline-offset-2"
            >
              Voir mon CV
            </a>
            {uploadedAt && (
              <span className="text-fs-200 text-color-text-secondary">
                · Mis à jour le{' '}
                {new Date(uploadedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-fs-200 text-color-text-secondary mb-space-3">
          Ton CV sera automatiquement inclus dans tes candidatures.
        </p>
      )}

      <div className="mt-space-3 flex flex-col gap-space-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="min-h-[44px] px-space-3 self-start rounded-gj-md border border-gj-line bg-color-surface text-fs-200 font-bold text-color-text-primary hover:bg-gj-bg disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gj-teal-deep"
        >
          {loading ? 'Envoi…' : cvUrl ? 'Remplacer mon CV' : 'Téléverser mon CV (PDF)'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
        {error && <p className="text-fs-200 text-gj-red">{error}</p>}
      </div>
    </Card>
  )
}
