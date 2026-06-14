'use client'

/**
 * <ProfilFileUploadButton /> — bouton compact (tap-min 44px) qui ouvre un
 * file-picker, valide MIME + magic-bytes côté client (défense en profondeur)
 * et POST le fichier vers une URL d'upload profil (diplôme / certificat).
 *
 * GUIC-360 — Profil uploads.
 */

import { useRef, useState } from 'react'

const ALLOWED_DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_DOC_BYTES    = 10 * 1024 * 1024

function clientMagicOk(mime: string, head: Uint8Array): boolean {
  if (mime === 'application/pdf') return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46
  if (mime === 'image/jpeg')      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  if (mime === 'image/png')       return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
  if (mime === 'image/webp') {
    return head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
      && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  }
  return false
}

interface Props {
  /** URL POST de l'endpoint (ex : `/api/profil/diplomes/abc/upload`). */
  url:           string
  /** URL actuelle du fichier déjà uploadé (affiche un lien « Voir »). */
  currentUrl?:   string | null
  /**
   * URL **proxy authentifiée** vers le Blob privé (ex :
   * `/api/profil/diplomes/abc/file`). Si fournie, le lien « Voir » pointe
   * vers ce proxy au lieu de l'URL Blob directe (privée non lisible sans token).
   * GUIC-364.
   */
  proxyUrl?:     string | null
  /** Libellé du bouton quand aucun fichier n'est encore attaché. */
  emptyLabel?:   string
  /** Libellé du bouton quand un fichier existe déjà. */
  replaceLabel?: string
  onUploaded:    (fileUrl: string) => void
}

export function ProfilFileUploadButton({
  url,
  currentUrl,
  proxyUrl,
  emptyLabel   = 'Joindre un fichier',
  replaceLabel = 'Remplacer',
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (!ALLOWED_DOC_MIME.includes(file.type)) {
      setError('Format invalide (PDF, JPEG, PNG ou WebP).')
      return
    }
    if (file.size > MAX_DOC_BYTES) {
      setError('Fichier trop volumineux (10 MB max).')
      return
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    if (!clientMagicOk(file.type, head)) {
      setError("Le contenu du fichier ne correspond pas au format déclaré.")
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch(url, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload impossible')
      onUploaded(json.data.fichierUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-1">
      <div className="flex items-center gap-space-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="min-h-[44px] px-space-3 rounded-gj-md border border-gj-line bg-color-surface text-fs-200 font-bold text-color-text-primary hover:bg-gj-bg disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gj-teal-deep"
        >
          {loading ? 'Envoi…' : currentUrl ? replaceLabel : emptyLabel}
        </button>
        {currentUrl && (
          <a
            href={proxyUrl ?? currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fs-200 font-bold text-gj-teal-deep underline underline-offset-2"
          >
            Voir le fichier
          </a>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
      </div>
      {error && <p className="text-fs-200 text-gj-red">{error}</p>}
    </div>
  )
}
