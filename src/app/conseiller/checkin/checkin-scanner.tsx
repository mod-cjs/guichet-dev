'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

/**
 * GUIC-498 — Scanner de présence in-app. Utilise l'API native BarcodeDetector
 * + la caméra arrière ; repli en saisie manuelle (URL/jeton) si non supportée.
 * Le QR de la carte CJS encode `/checkin/v1/<jeton>` → on ouvre la confirmation.
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

export function CheckinScanner() {
  const router = useRouter()
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

  const goToken = useCallback((token: string) => {
    stop()
    router.push(`/checkin/v1/${token}`)
  }, [router, stop])

  const start = useCallback(async () => {
    setError(null)
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!Ctor) {
      setError("Le scan caméra n'est pas supporté par ce navigateur. Utilisez la saisie manuelle ci-dessous.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
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
      setError("Accès caméra refusé ou indisponible. Autorisez la caméra ou utilisez la saisie manuelle.")
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

      <div className="flex gap-space-2 flex-wrap">
        {!active ? (
          <button type="button" onClick={start} className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '11px 18px', borderRadius: 10, fontSize: 14 }}>
            <Icon name="camera" size={16} /> Ouvrir la caméra
          </button>
        ) : (
          <button type="button" onClick={stop} className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: '#fff', color: 'var(--gj-red)', border: '1.5px solid var(--gj-line)', padding: '11px 18px', borderRadius: 10, fontSize: 14 }}>
            <Icon name="close" size={16} /> Arrêter
          </button>
        )}
      </div>

      {error && <div className="text-fs-200" style={{ color: 'var(--gj-red)' }}>{error}</div>}

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
