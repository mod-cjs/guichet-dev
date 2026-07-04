'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

/**
 * GUIC-521 — Scanner de carte CJS réutilisable (caméra arrière + BarcodeDetector).
 * Appelle `onToken(rawValue)` à la première détection. Gestion fine de
 * l'autorisation caméra (contexte sécurisé, refus, aucune caméra), repli manuel.
 */
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike

function describe(err: unknown): { msg: string; denied: boolean } {
  const name = err instanceof DOMException ? err.name : ''
  switch (name) {
    case 'NotAllowedError': case 'SecurityError':
      return { denied: true, msg: 'Accès caméra refusé. Autorisez la caméra puis réessayez.' }
    case 'NotFoundError': case 'DevicesNotFoundError':
      return { denied: false, msg: 'Aucune caméra détectée. Utilisez la saisie manuelle.' }
    case 'NotReadableError': case 'TrackStartError':
      return { denied: false, msg: 'Caméra déjà utilisée par une autre application.' }
    default:
      return { denied: false, msg: 'Impossible d’ouvrir la caméra.' }
  }
}

export function CardScanner({ onToken, pending }: { onToken: (raw: string) => void; pending?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setActive(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  const start = useCallback(async () => {
    setError(null)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('La caméra nécessite HTTPS. Utilisez la saisie manuelle.'); return
    }
    if (!navigator.mediaDevices?.getUserMedia) { setError('Caméra indisponible ici.'); return }
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!Ctor) { setError('Scan non supporté par ce navigateur. Saisie manuelle ci-dessous.'); return }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
    } catch (err) { setError(describe(err).msg); stop(); return }
    try {
      streamRef.current = stream; setActive(true)
      const video = videoRef.current; if (!video) return
      video.srcObject = stream; await video.play()
      const detector = new Ctor({ formats: ['qr_code'] })
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes[0]?.rawValue) { stop(); onToken(codes[0].rawValue); return }
        } catch { /* frame illisible */ }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch { setError('Impossible de démarrer l’aperçu.'); stop() }
  }, [onToken, stop])

  return (
    <div className="flex flex-col gap-space-3">
      <div className="relative rounded-gj-lg overflow-hidden" style={{ background: '#000', aspectRatio: '4 / 3', display: active ? 'block' : 'none' }}>
        <video ref={videoRef} playsInline muted className="w-full h-full" style={{ objectFit: 'cover' }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div style={{ width: '64%', aspectRatio: '1', border: '3px solid rgba(255,255,255,.95)', borderRadius: 18, boxShadow: '0 0 0 100vmax rgba(0,0,0,.4)' }} />
        </div>
        {pending && <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,.5)', color: '#fff', fontWeight: 800 }}>Lecture…</div>}
      </div>

      {error && (
        <div className="flex items-start gap-space-2 rounded-gj-md" style={{ background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)', padding: '10px 12px', fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="alert" size={15} className="shrink-0" style={{ marginTop: 1 }} /> <span>{error}</span>
        </div>
      )}

      {!active ? (
        <button type="button" onClick={start} disabled={pending} className="inline-flex items-center justify-center gap-space-2 font-extrabold disabled:opacity-60" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, minHeight: 56, borderRadius: 14, fontSize: 16 }}>
          <Icon name="camera" size={20} /> {error ? 'Réessayer' : 'Scanner la carte CJS'}
        </button>
      ) : (
        <button type="button" onClick={stop} className="inline-flex items-center justify-center gap-space-2 font-extrabold" style={{ background: '#fff', color: 'var(--gj-red)', border: '1.5px solid var(--gj-line)', minHeight: 48, borderRadius: 12, fontSize: 14 }}>
          <Icon name="close" size={16} /> Arrêter
        </button>
      )}

      <details>
        <summary className="cursor-pointer text-fs-200 font-extrabold" style={{ color: 'var(--gj-teal-deep)' }}>Saisie manuelle (lien/jeton de la carte)</summary>
        <div className="flex gap-space-2 mt-space-2 flex-wrap">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://…/checkin/v1/… ou le jeton" aria-label="Lien ou jeton" className="flex-1 outline-none text-fs-300" style={{ border: '1.5px solid var(--gj-line)', borderRadius: 9, padding: '10px 12px', minWidth: 180, color: 'var(--gj-ink)' }} />
          <button type="button" onClick={() => manual.trim() && onToken(manual.trim())} disabled={!manual.trim() || pending} className="font-extrabold disabled:opacity-50" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '10px 16px', borderRadius: 9, fontSize: 13 }}>Valider</button>
        </div>
      </details>
    </div>
  )
}
