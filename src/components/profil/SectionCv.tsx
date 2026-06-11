'use client'

/**
 * <SectionCv /> — bloc CV du profil jeune (GUIC-365).
 *
 * Permet au jeune d'uploader / remplacer son CV PDF (5 MB max). L'upload va
 * sur `/api/profil/cv` (POST) qui persiste `ProfilJeune.cvUrl`, réutilisé
 * ensuite par `CandidatureModal` (« Utiliser mon CV de profil »).
 */

import { useRef, useState } from 'react'
import { Card, Button } from '@/components/ui'

interface Props {
  initialCvUrl?: string | null
}

const ALLOWED = ['application/pdf']
const MAX_BYTES = 5 * 1024 * 1024

function magicPdf(head: Uint8Array): boolean {
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46
}

export function SectionCv({ initialCvUrl }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [cvUrl, setCvUrl]   = useState<string | null>(initialCvUrl ?? null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function upload(file: File) {
    setError(null)
    if (!ALLOWED.includes(file.type)) {
      setError('Format invalide (PDF requis).')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Fichier trop volumineux (5 MB max).')
      return
    }
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
    if (!magicPdf(head)) {
      setError("Le fichier n'est pas un PDF valide.")
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/profil/cv', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload impossible')
      // Le POST renvoie `{ data: { cvUrl, name, uploadedAt } }`.
      const newUrl = json.data?.cvUrl as string | null
      if (!newUrl) throw new Error('Réponse serveur invalide')
      // Cache-bust pour forcer l'affichage immédiat du nouveau CV.
      setCvUrl(`${newUrl}${newUrl.includes('?') ? '&' : '?'}ts=${Date.now()}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-space-4">
        <h2 className="text-fs-400 font-bold text-color-text-primary">CV</h2>
      </div>

      <div className="flex flex-col gap-space-3">
        <p className="text-fs-200 text-color-text-secondary">
          Format PDF · 5 MB max. Réutilisé automatiquement dans tes candidatures.
        </p>

        <div className="flex items-center gap-space-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
            loading={loading}
            className="min-h-[44px]"
          >
            {cvUrl ? 'Remplacer mon CV' : 'Ajouter mon CV'}
          </Button>

          {cvUrl && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fs-200 font-bold text-gj-teal-deep underline underline-offset-2"
            >
              Voir mon CV
            </a>
          )}
        </div>

        {error && <p className="text-fs-200 text-gj-red">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) void upload(f)
            e.target.value = ''
          }}
        />
      </div>
    </Card>
  )
}
