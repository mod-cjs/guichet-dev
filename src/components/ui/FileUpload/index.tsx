'use client'
import { ChangeEvent, useCallback, useId, useRef, useState } from 'react'
import { Icon } from '../Icon'
import {
  ALLOWED_CV_MIME,
  MAX_CV_BYTES,
  MAX_CV_MB,
} from '@/lib/constants/candidature'

/**
 * Métadonnées renvoyées par l'appelant après upload réussi.
 * Compatible avec `CvBlobMeta` (src/types/candidature.ts).
 */
export interface UploadedFileMeta {
  url: string
  name: string
  sizeKb: number
}

/**
 * Callback d'upload — l'appelant décide où poster (Vercel Blob, API
 * proxy /api/upload/cv, etc.). Doit renvoyer la meta blob ou throw.
 *
 * `safeName` est déjà sanitizé (caractères dangereux remplacés par `_`)
 * pour limiter les risques côté stockage / URL.
 */
export type FileUploader = (safeName: string, file: File) => Promise<UploadedFileMeta>

export interface FileUploadProps {
  /** Libellé visuel (par défaut « CV »). */
  label?: string
  /** Implémentation d'upload (réseau). */
  upload: FileUploader
  /** Notifie le parent quand un fichier est uploadé / supprimé. */
  onChange?: (meta: UploadedFileMeta | null) => void
  /** Types MIME acceptés (défaut PDF uniquement). */
  accept?: readonly string[]
  /** Taille max en octets (défaut `MAX_CV_BYTES`). */
  maxBytes?: number
  /** Désactive l'interaction. */
  disabled?: boolean
}

/** Remplace les caractères non sûrs du nom de fichier par `_`. */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Primitive `FileUpload` — CV / pièce jointe (GUIC-189 / Wave 6 / GUIC-217).
 *
 * - A11y : `role="progressbar"` pendant l'upload, `aria-live="polite"`
 *   sur le résumé, `role="alert"` sur l'erreur.
 * - Sécurité : sanitization du nom de fichier avant appel `upload()`.
 * - Mobile : bouton « Changer » respecte `--tap-min` (44px).
 */
export function FileUpload({
  label = 'CV',
  upload,
  onChange,
  accept = ALLOWED_CV_MIME,
  maxBytes = MAX_CV_BYTES,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<UploadedFileMeta | null>(null)
  const inputId = useId()

  const openPicker = useCallback(() => {
    if (disabled) return
    inputRef.current?.click()
  }, [disabled])

  const handlePick = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      // Toujours réinitialiser la valeur pour qu'un même fichier puisse
      // être resélectionné après suppression / erreur.
      if (e.target) e.target.value = ''
      if (!file) return

      setError(null)

      if (!(accept as readonly string[]).includes(file.type)) {
        setError(`Format non supporté — accepté : ${accept.join(', ')}.`)
        return
      }
      if (file.size > maxBytes) {
        setError(`Fichier trop volumineux (max ${MAX_CV_MB} Mo).`)
        return
      }

      const safeName = sanitizeFilename(file.name)
      setProgress(0)
      try {
        // Fake-progress ramp pour feedback utilisateur ; l'upload réel
        // est piloté par l'appelant (souvent un POST atomique).
        setProgress(40)
        const result = await upload(safeName, file)
        setProgress(100)
        setMeta(result)
        onChange?.(result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Échec de l’upload.'
        setError(msg)
      } finally {
        setProgress(null)
      }
    },
    [accept, maxBytes, onChange, upload],
  )

  const reset = useCallback(() => {
    setMeta(null)
    setError(null)
    onChange?.(null)
  }, [onChange])

  return (
    <div className="flex flex-col gap-space-2">
      <label htmlFor={inputId} className="text-fs-200 font-bold text-color-text-primary">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept.join(',')}
        className="sr-only"
        onChange={handlePick}
        disabled={disabled}
      />

      {!meta && progress === null && (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="min-h-[var(--tap-min)] inline-flex items-center justify-center gap-space-2
            px-space-4 py-space-2 rounded-gj-md border border-gj-line bg-white
            text-color-text-primary hover:bg-gj-bg disabled:opacity-50"
        >
          <Icon name="upload" />
          <span>Choisir un fichier</span>
        </button>
      )}

      {progress !== null && (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload de ${label}`}
          className="h-2 w-full rounded-gj-pill bg-gj-bg overflow-hidden"
        >
          <div
            className="h-full bg-gj-teal transition-[width] duration-[var(--motion-base)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div aria-live="polite" className="contents">
        {meta && progress === null && (
          <div className="flex items-center justify-between gap-space-2 rounded-gj-md
            border border-gj-line px-space-3 py-space-2 bg-gj-bg">
            <div className="flex items-center gap-space-2 min-w-0">
              <Icon name="document" />
              <span className="truncate text-fs-200 text-color-text-primary">
                {label} chargé : {meta.name}
              </span>
              <span className="text-fs-100 text-gj-grey shrink-0">
                ({meta.sizeKb} Ko)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                reset()
                openPicker()
              }}
              disabled={disabled}
              className="min-h-[var(--tap-min)] px-space-3 text-fs-200 font-bold
                text-gj-teal hover:underline disabled:opacity-50"
            >
              Changer
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-space-2 rounded-gj-md border border-gj-red
            bg-gj-red-soft px-space-3 py-space-2 text-fs-200 text-gj-red-ink"
        >
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// Export pour tests / réutilisation interne.
export { sanitizeFilename }
