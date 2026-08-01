'use client'

import { useRef, useState, type CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Champ image uploadable (GUIC-687) — poste vers /api/upload/image (bucket, admin-gardé,
 * MIME + taille validés côté serveur) et remonte l'URL au parent. Aperçu + « Changer »/
 * « Retirer ». Thème-conscient (langage fmodal admin).
 */
export function ImageUploadField({ value, onChange, disabled }: { value: string; onChange: (url: string) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pick() { if (!disabled && !busy) inputRef.current?.click() }

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return
    setError(null)
    if (!ACCEPT.includes(file.type)) { setError('Format accepté : JPEG, PNG ou WebP.'); return }
    if (file.size > MAX_BYTES) { setError('Image trop volumineuse (max 5 Mo).'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.data?.url) throw new Error(json?.error?.message ?? 'Upload impossible')
      onChange(json.data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload impossible')
    } finally {
      setBusy(false)
    }
  }

  const btn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: disabled || busy ? 'default' : 'pointer', background: 'transparent', color: 'var(--gj-ink)', border: '1px solid var(--gj-line-strong)', opacity: disabled || busy ? 0.6 : 1 }

  return (
    <div>
      <input ref={inputRef} type="file" accept={ACCEPT.join(',')} className="sr-only" onChange={handle} disabled={disabled} aria-label="Choisir une image" />
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <img src={value} alt="Aperçu de la ressource" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 9, border: '1px solid var(--gj-line)', flexShrink: 0 }} />
          <button type="button" onClick={pick} disabled={disabled || busy} style={btn}>
            <Icon name="upload" size={14} /> {busy ? 'Envoi…' : 'Changer'}
          </button>
          <button type="button" onClick={() => onChange('')} disabled={disabled || busy} style={{ ...btn, borderColor: 'var(--gj-red)', color: 'var(--gj-red-ink)' }}>
            <Icon name="close" size={14} /> Retirer
          </button>
        </div>
      ) : (
        <button type="button" onClick={pick} disabled={disabled || busy} style={btn}>
          <Icon name="upload" size={14} /> {busy ? 'Envoi…' : 'Choisir une image'}
        </button>
      )}
      {error && <p role="alert" style={{ fontSize: 11.5, color: 'var(--gj-red-ink)', fontWeight: 700, marginTop: 6 }}>{error}</p>}
    </div>
  )
}
