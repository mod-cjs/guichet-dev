'use client'

import { useId, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

export interface JustificatifUploadProps {
  required?: boolean
  file?: File | null
  onChange: (file: File | null) => void
  /** Taille max en MB. */
  maxSizeMB?: number
  /** MIME types acceptés. */
  acceptedTypes?: string[]
  className?: string
}

const DEFAULT_ACCEPTED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

const SIG_PDF = [0x25, 0x50, 0x44, 0x46] // "%PDF"
const SIG_JPEG = [0xff, 0xd8, 0xff]
const SIG_PNG = [0x89, 0x50, 0x4e, 0x47]

async function detectMagicBytes(file: File): Promise<string | null> {
  const buf = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const match = (sig: number[]) =>
    sig.every((b, i) => buf[i] === b)
  if (match(SIG_PDF)) return 'application/pdf'
  if (match(SIG_JPEG)) return 'image/jpeg'
  if (match(SIG_PNG)) return 'image/png'
  return null
}

/**
 * <JustificatifUpload> — drop zone fichier pour réservation (W4).
 *
 * Validation : type MIME + magic-bytes (4 premiers octets) + taille.
 * Spec : M4-centres-lot7.md §5 Wave 4. Pattern GUIC-241.
 */
export function JustificatifUpload({
  required = false,
  file = null,
  onChange,
  maxSizeMB = 5,
  acceptedTypes = DEFAULT_ACCEPTED,
  className = '',
}: JustificatifUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dropId = useId()
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setDragging] = useState(false)

  const handleFile = async (next: File | null) => {
    setError(null)
    if (!next) {
      onChange(null)
      return
    }
    const maxBytes = maxSizeMB * 1024 * 1024
    if (next.size > maxBytes) {
      setError(`Fichier trop volumineux (max ${maxSizeMB} MB).`)
      return
    }
    if (!acceptedTypes.includes(next.type)) {
      setError('Type de fichier non supporté (PDF, JPG, PNG).')
      return
    }
    const detected = await detectMagicBytes(next)
    if (!detected || !acceptedTypes.includes(detected)) {
      setError('Contenu du fichier non valide (signature incorrecte).')
      return
    }
    onChange(next)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    void handleFile(f)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0] ?? null
    void handleFile(f)
  }

  return (
    <div className={className}>
      <div
        data-testid="justificatif-dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${
            isDragging ? 'var(--gj-teal-deep)' : 'var(--gj-line-strong)'
          }`,
          borderRadius: 10,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--gj-bg)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            background: 'var(--gj-surface)',
            color: 'var(--gj-teal-deep)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="upload" size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--gj-ink)',
            }}
          >
            {file ? file.name : 'Ajouter un document'}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--gj-grey)',
              marginTop: 1,
            }}
          >
            {required
              ? 'Pièce requise (PDF, JPG, PNG · 5 MB max)'
              : 'Facultatif (PDF, JPG, PNG · 5 MB max)'}
          </div>
        </div>
        {file ? (
          <button
            type="button"
            onClick={() => handleFile(null)}
            aria-label="Retirer le fichier"
            style={{
              background: 'var(--gj-surface)',
              color: 'var(--gj-red-ink)',
              border: '1.5px solid var(--gj-line)',
              padding: '8px 13px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Retirer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Parcourir les fichiers"
            style={{
              background: 'var(--gj-surface)',
              color: 'var(--gj-teal-deep)',
              border: '1.5px solid var(--gj-line)',
              padding: '8px 13px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Parcourir
          </button>
        )}
        <input
          ref={inputRef}
          id={dropId}
          type="file"
          accept={acceptedTypes.join(',')}
          required={required}
          onChange={onInputChange}
          style={{ display: 'none' }}
        />
      </div>
      {error ? (
        <div
          role="alert"
          style={{
            marginTop: 6,
            fontSize: 12,
            color: 'var(--gj-red-ink)',
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}
