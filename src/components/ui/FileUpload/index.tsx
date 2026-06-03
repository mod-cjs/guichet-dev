'use client'
import { useCallback, useRef, useState } from 'react'

export interface FileUploadProps {
  /** Endpoint serveur qui implémente le pattern `handleUpload` de Vercel Blob. */
  handleUploadUrl: string
  /** MIME accepté (défaut `application/pdf`). */
  accept?: string
  /** Taille max en MiB (défaut 5). */
  maxSizeMb?: number
  /** Label visible au-dessus du sélecteur. */
  label?: string
  /** Texte d'aide (taille, format). */
  hint?: string
  /** Valeur courante (URL Blob déjà uploadée). */
  value?: string | null
  onChange: (next: { url: string; name: string; sizeKb: number } | null) => void
  /** Appelé en cas d'erreur (validation MIME/taille ou réseau). */
  onError?: (msg: string) => void
  disabled?: boolean
  id?: string
}

const DEFAULT_ACCEPT = 'application/pdf'
const DEFAULT_MAX_MB = 5

/**
 * GUIC-189 — Champ d'upload de fichier (CV) qui pousse vers Vercel Blob via
 * `@vercel/blob/client#upload`. Validation MIME + taille côté client avant le
 * round-trip ; la garantie finale reste côté serveur (`onBeforeGenerateToken`).
 */
export function FileUpload({
  handleUploadUrl,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = DEFAULT_MAX_MB,
  label = 'Fichier',
  hint,
  value,
  onChange,
  onError,
  disabled,
  id,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [fileMeta, setFileMeta] = useState<{ name: string; sizeKb: number } | null>(null)
  const inputId = id ?? 'file-upload'
  const maxBytes = maxSizeMb * 1024 * 1024

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== accept) {
        onError?.(`Format invalide — ${accept} attendu`)
        return
      }
      if (file.size > maxBytes) {
        onError?.(`Fichier trop volumineux (max ${maxSizeMb} Mo)`)
        return
      }
      setUploading(true)
      setProgress(0)
      try {
        // Import dynamique : évite d'embarquer le SDK Blob côté serveur.
        const { upload } = await import('@vercel/blob/client')
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl,
          onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
        })
        const sizeKb = Math.round(file.size / 1024)
        setFileMeta({ name: file.name, sizeKb })
        onChange({ url: blob.url, name: file.name, sizeKb })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload impossible'
        onError?.(msg)
      } finally {
        setUploading(false)
      }
    },
    [accept, handleUploadUrl, maxBytes, maxSizeMb, onChange, onError],
  )

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void handleFile(f)
  }

  const reset = () => {
    setFileMeta(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (value || fileMeta) {
    return (
      <div className="flex flex-col gap-space-1">
        {label && (
          <span className="text-fs-100 font-bold uppercase tracking-wide text-color-text-muted">
            {label}
          </span>
        )}
        <div
          className="flex items-center gap-space-3 rounded-gj-md border-[1.5px] border-gj-line
            bg-white px-space-3 py-space-2"
        >
          <span
            className="inline-flex h-10 w-8 items-center justify-center rounded-[4px]
              bg-gj-red-soft text-gj-red-ink text-[10px] font-black"
            aria-hidden
          >
            PDF
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-fs-200 font-bold text-color-text-primary">
              {fileMeta?.name ?? 'CV'}
            </p>
            <p className="text-fs-100 text-color-text-muted">
              {fileMeta ? `${fileMeta.sizeKb} Ko` : 'Fichier enregistré'} · coffre-fort
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={disabled || uploading}
            className="text-fs-200 font-bold text-gj-teal-deep hover:underline disabled:opacity-50"
          >
            Changer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-space-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-fs-100 font-bold uppercase tracking-wide text-color-text-muted"
        >
          {label}
        </label>
      )}
      <label
        htmlFor={inputId}
        className={`flex flex-col items-center justify-center gap-space-1 rounded-gj-md
          border-[1.5px] border-dashed border-gj-line bg-gj-bg px-space-4 py-space-4
          text-center cursor-pointer hover:border-gj-teal-deep transition-colors
          ${disabled || uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <span className="text-fs-300 font-bold text-color-text-primary">
          {uploading ? `Envoi… ${progress}%` : 'Choisir un fichier'}
        </span>
        {hint && <span className="text-fs-100 text-color-text-muted">{hint}</span>}
        {!hint && (
          <span className="text-fs-100 text-color-text-muted">
            PDF · max {maxSizeMb} Mo
          </span>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={onPick}
          disabled={disabled || uploading}
        />
      </label>
    </div>
  )
}
