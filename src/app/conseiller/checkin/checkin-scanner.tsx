'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

/**
 * GUIC-498 — Scanner de présence in-app. Utilise l'API native BarcodeDetector
 * + la caméra arrière ; repli en saisie manuelle (URL/jeton) si non supportée.
 * Le QR de la carte CJS encode `/checkin/v1/<jeton>` → on ouvre la confirmation.
 *
 * Gestion de l'autorisation caméra : contexte sécurisé requis (HTTPS/localhost),
 * pré-vérification via l'API Permissions, messages explicites par type d'erreur
 * (refus, aucune caméra, caméra occupée), et repli sans contrainte `facingMode`.
 */

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike

function extractToken(raw: string): string | null {
  const marker = '/checkin/v1/'
  const i = raw.indexOf(marker)
  if (i === -1) return null
  const token = raw.slice(i + marker.length).split(/[/?#\s]/)[0]
  return token || null
}

/** Message + drapeau « refus de permission » selon le type d'erreur getUserMedia. */
function describeCameraError(err: unknown): { msg: string; denied: boolean } {
  const name = err instanceof DOMException ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return { denied: true, msg: 'Accès à la caméra refusé. Autorisez la caméra pour ce site dans les réglages du navigateur, puis réessayez.' }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { denied: false, msg: 'Aucune caméra détectée sur cet appareil. Utilisez la saisie manuelle.' }
    case 'NotReadableError':
    case 'TrackStartError':
      return { denied: false, msg: 'La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez.' }
    default:
      return { denied: false, msg: 'Impossible d’ouvrir la caméra. Réessayez ou utilisez la saisie manuelle.' }
  }
}

/** Ouvre la caméra arrière si possible, sinon n'importe quelle caméra. */
async function openCamera(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) {
      return navigator.mediaDevices.getUserMedia({ video: true })
    }
    throw e
  }
}

export function CheckinScanner() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [manual, setManual] = useState('')

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setActive(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  // Pré-vérification de la permission caméra (best-effort) — informe l'utilisateur
  // en amont si l'accès a déjà été refusé.
  useEffect(() => {
    const perms = (navigator as unknown as { permissions?: { query?: (d: { name: string }) => Promise<{ state: string }> } }).permissions
    if (!perms?.query) return
    let cancelled = false
    perms.query({ name: 'camera' })
      .then((status) => { if (!cancelled && status.state === 'denied') setDenied(true) })
      .catch(() => { /* certains navigateurs ne connaissent pas 'camera' */ })
    return () => { cancelled = true }
  }, [])

  const goToken = useCallback((token: string) => {
    stop()
    router.push(`/checkin/v1/${token}`)
  }, [router, stop])

  const start = useCallback(async () => {
    setError(null)
    setDenied(false)

    // Contexte sécurisé obligatoire pour getUserMedia (HTTPS ou localhost).
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('La caméra nécessite une connexion sécurisée (HTTPS). Utilisez la saisie manuelle ci-dessous.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Ce navigateur ne permet pas l’accès à la caméra ici. Utilisez la saisie manuelle.')
      return
    }
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!Ctor) {
      setError('Le scan n’est pas supporté par ce navigateur. Utilisez l’appareil photo natif sur le QR, ou la saisie manuelle.')
      return
    }

    let stream: MediaStream
    try {
      stream = await openCamera()
    } catch (err) {
      const { msg, denied: isDenied } = describeCameraError(err)
      setError(msg)
      setDenied(isDenied)
      stop()
      return
    }

    try {
      streamRef.current = stream
      setActive(true)
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      const detector = new Ctor({ formats: ['qr_code'] })
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          for (const c of codes) {
            const token = extractToken(c.rawValue)
            if (token) { goToken(token); return }
          }
        } catch { /* frame illisible — on continue */ }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setError('Impossible de démarrer l’aperçu caméra. Réessayez.')
      stop()
    }
  }, [goToken, stop])

  const submitManual = () => {
    const token = extractToken(manual) ?? manual.trim()
    if (token) goToken(token)
  }

  return (
    <div className="bg-white rounded-gj-lg p-space-5 flex flex-col gap-space-4" style={{ border: '1.5px solid var(--gj-line)' }}>
      <div className="flex items-center gap-space-3">
        <span className="inline-flex items-center justify-center shrink-0 rounded-gj-md" style={{ width: 44, height: 44, background: 'var(--gj-teal-deep)', color: '#fff' }}>
          <Icon name="target" size={22} />
        </span>
        <div className="min-w-0">
          <div className="font-extrabold text-color-text-primary" style={{ fontSize: 15 }}>Scanner une présence</div>
          <div className="text-color-text-secondary" style={{ fontSize: 12 }}>Pointez la caméra sur le QR de la carte CJS du jeune.</div>
        </div>
      </div>

      {/* Zone caméra */}
      <div className="relative rounded-gj-md overflow-hidden" style={{ background: '#000', aspectRatio: '4 / 3', display: active ? 'block' : 'none' }}>
        <video ref={videoRef} playsInline muted className="w-full h-full" style={{ objectFit: 'cover' }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div style={{ width: '62%', aspectRatio: '1', border: '3px solid rgba(255,255,255,.9)', borderRadius: 16, boxShadow: '0 0 0 100vmax rgba(0,0,0,.35)' }} />
        </div>
      </div>

      {/* Message d'erreur / d'autorisation */}
      {error && (
        <div className="flex items-start gap-space-2 rounded-gj-md" style={{ background: 'var(--gj-red-soft)', color: 'var(--gj-red-ink)', padding: '10px 12px', fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="alert" size={15} className="shrink-0" style={{ marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-space-2 flex-wrap items-center">
        {!active ? (
          <button type="button" onClick={start} className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '11px 18px', borderRadius: 10, fontSize: 14 }}>
            <Icon name="camera" size={16} /> {error || denied ? 'Réessayer' : 'Ouvrir la caméra'}
          </button>
        ) : (
          <button type="button" onClick={stop} className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: '#fff', color: 'var(--gj-red)', border: '1.5px solid var(--gj-line)', padding: '11px 18px', borderRadius: 10, fontSize: 14 }}>
            <Icon name="close" size={16} /> Arrêter
          </button>
        )}
        {denied && (
          <span className="text-fs-100 text-color-text-secondary">
            Astuce : touchez l’icône caméra/cadenas dans la barre d’adresse pour réautoriser.
          </span>
        )}
      </div>

      {/* Repli : saisie manuelle du lien/jeton */}
      <details>
        <summary className="cursor-pointer text-fs-200 font-extrabold" style={{ color: 'var(--gj-teal-deep)' }}>Saisie manuelle (lien ou jeton du QR)</summary>
        <div className="flex gap-space-2 mt-space-2 flex-wrap">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="https://…/checkin/v1/… ou le jeton"
            aria-label="Lien ou jeton du QR"
            className="flex-1 outline-none text-fs-300"
            style={{ border: '1.5px solid var(--gj-line)', borderRadius: 9, padding: '10px 12px', minWidth: 180, color: 'var(--gj-ink)' }}
          />
          <button type="button" onClick={submitManual} disabled={!manual.trim()} className="font-extrabold disabled:opacity-50" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '10px 16px', borderRadius: 9, fontSize: 13 }}>
            Ouvrir
          </button>
        </div>
      </details>
    </div>
  )
}
