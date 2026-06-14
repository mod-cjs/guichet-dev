'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { CJSCardFlip } from '@/components/centres/CJSCardFlip'
import { MesUsagesGrid } from '@/components/centres/MesUsagesGrid'
import { Icon } from '@/components/ui/Icon'
import type { UsageCarteCJS } from '@/lib/loaders/centres'
import type { MyCJSCardUser } from '@/components/centres/MyCJSCard'

interface Props {
  user: MyCJSCardUser
  cjsUid: string
  usages: UsageCarteCJS[]
}

interface QrTokenState {
  token: string | null
  expiresAt: Date | null
  refreshAt: Date | null
  loading: boolean
  error: string | null
}

const INITIAL_QR: QrTokenState = {
  token: null,
  expiresAt: null,
  refreshAt: null,
  loading: true,
  error: null,
}

/**
 * Client component pour `/jeune/ma-carte` (GUIC-386 / Wave 6.1).
 *
 * - Récupère le QR JWT via `GET /api/cjs-card/qr-token`
 * - Auto-refresh à `refreshAt` (≈ 14 min après émission)
 * - Affiche carte (recto + flip verso), grid usages, CTAs
 * - Tracking au mount : `centre_my_card_viewed`
 */
export function MaCarteClient({ user, cjsUid, usages }: Props) {
  const [qr, setQr] = useState<QrTokenState>(INITIAL_QR)
  const [now, setNow] = useState<number>(() => Date.now())
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trackedRef = useRef(false)

  const fetchToken = useCallback(async () => {
    setQr((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch('/api/cjs-card/qr-token', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        setQr({
          token: null,
          expiresAt: null,
          refreshAt: null,
          loading: false,
          error: `HTTP ${res.status}`,
        })
        return
      }
      const body = (await res.json()) as {
        data?: { token: string; expiresAt: string; refreshAt: string }
      }
      const d = body.data
      if (!d) {
        setQr({
          token: null,
          expiresAt: null,
          refreshAt: null,
          loading: false,
          error: 'Réponse invalide',
        })
        return
      }
      setQr({
        token: d.token,
        expiresAt: new Date(d.expiresAt),
        refreshAt: new Date(d.refreshAt),
        loading: false,
        error: null,
      })
    } catch (e) {
      setQr({
        token: null,
        expiresAt: null,
        refreshAt: null,
        loading: false,
        error: e instanceof Error ? e.message : 'Erreur réseau',
      })
    }
  }, [])

  // Tracking au mount (une fois)
  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    fetch('/api/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'centre_my_card_viewed',
        cjsUid,
        metadata: { usages_count: usages.length },
      }),
    }).catch(() => {
      /* fail-soft */
    })
  }, [cjsUid, usages.length])

  // Premier fetch + programmation auto-refresh à `refreshAt`
  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    if (!qr.refreshAt) return
    const delay = Math.max(1000, qr.refreshAt.getTime() - Date.now())
    refreshTimerRef.current = setTimeout(() => {
      fetchToken()
    }, delay)
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [qr.refreshAt, fetchToken])

  // Tick 1s pour le compteur "valide encore X min"
  useEffect(() => {
    if (!qr.expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [qr.expiresAt])

  const remainingMs = qr.expiresAt ? qr.expiresAt.getTime() - now : 0
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60000))
  const progressPct = qr.expiresAt
    ? Math.max(0, Math.min(100, Math.round((remainingMs / (15 * 60_000)) * 100)))
    : 0

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-8">
      {/* Section 1 — Carte + QR */}
      <section aria-labelledby="ma-carte-title" className="flex flex-col gap-3">
        <h1
          id="ma-carte-title"
          className="text-fs-800 font-black"
          style={{ color: 'var(--gj-ink)', margin: 0 }}
        >
          Ma carte CJS
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--gj-grey)',
            margin: 0,
          }}
        >
          Présente ton QR à l’accueil d’un centre CJS pour valider ta présence.
        </p>

        <div
          style={{
            boxShadow: '0 12px 32px rgba(0,0,0,.18)',
            borderRadius: 16,
          }}
        >
          <CJSCardFlip
            user={user}
            cjsUid={cjsUid}
            qrToken={qr.token}
            qrExpiresAt={qr.expiresAt}
          />
        </div>

        {/* État QR */}
        <div
          aria-live="polite"
          data-testid="qr-status"
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gj-ink)' }}>
              {qr.loading
                ? 'Génération du QR…'
                : qr.error
                  ? 'QR indisponible'
                  : `QR valide encore ${remainingMin} min`}
            </span>
            <button
              type="button"
              onClick={fetchToken}
              disabled={qr.loading}
              aria-label="Rafraîchir le QR"
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--gj-teal-deep)',
                fontWeight: 800,
                fontSize: 12,
                cursor: qr.loading ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                minHeight: 'var(--tap-min, 44px)',
              }}
            >
              <Icon name="arrow-up" size={14} />
              Rafraîchir
            </button>
          </div>
          <div
            aria-hidden="true"
            style={{
              height: 4,
              borderRadius: 999,
              background: 'var(--gj-bg)',
              overflow: 'hidden',
            }}
          >
            <div
              data-testid="qr-progress"
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background:
                  progressPct < 15 ? 'var(--gj-red)' : 'var(--gj-teal-deep)',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>

        {/* Section 3 — CTAs (placés sous la carte pour mobile-first) */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/jeune/mes-reservations-centres"
            className="no-underline"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'var(--gj-teal-deep)',
              color: 'var(--gj-surface)',
              fontWeight: 800,
              fontSize: 13,
              textAlign: 'center',
              minHeight: 'var(--tap-min, 44px)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icon name="bookmark" size={16} />
            Mes réservations
          </Link>
          <Link
            href="/centres"
            className="no-underline"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'var(--gj-yellow)',
              color: 'var(--gj-ink)',
              fontWeight: 800,
              fontSize: 13,
              textAlign: 'center',
              minHeight: 'var(--tap-min, 44px)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icon name="plus" size={16} />
            Réserver une ressource
          </Link>
        </div>
      </section>

      {/* Section 2 — Usages récents */}
      <section
        aria-labelledby="usages-title"
        className="flex flex-col gap-3"
      >
        <h2
          id="usages-title"
          className="text-fs-600 font-black"
          style={{ color: 'var(--gj-ink)', margin: 0 }}
        >
          Tes derniers usages
        </h2>
        <MesUsagesGrid usages={usages} />
      </section>
    </div>
  )
}
