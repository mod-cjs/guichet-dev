'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { CJSCardFlip } from '@/components/centres/CJSCardFlip'
import { MesUsagesGrid } from '@/components/centres/MesUsagesGrid'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
 * GUIC-391 — CTA Link "bouton-like" : reprend les classes de `<Button>` mais
 * en composant Link (le Button est un `<button>`, pas adapté pour la navigation).
 * Variant : 'primary' (teal) | 'yellow'.
 */
function CtaLink({
  href,
  variant,
  icon,
  children,
}: {
  href: string
  variant: 'primary' | 'yellow'
  icon: 'bookmark' | 'plus'
  children: React.ReactNode
}) {
  const variantClasses =
    variant === 'primary'
      ? 'bg-gj-teal-deep text-white hover:bg-gj-teal'
      : 'bg-gj-yellow text-gj-ink hover:opacity-90'
  return (
    <Link
      href={href}
      className={[
        'no-underline flex-1 inline-flex items-center justify-center gap-2',
        'rounded-gj-md font-bold text-fs-300 px-space-4',
        'min-h-[var(--tap-min,44px)]',
        variantClasses,
      ].join(' ')}
    >
      <Icon name={icon} size={16} />
      {children}
    </Link>
  )
}

/**
 * Client component pour `/jeune/ma-carte` (GUIC-386 / Wave 6.1).
 *
 * - Récupère le QR JWT via `GET /api/cjs-card/qr-token`
 * - Auto-refresh à `refreshAt` (≈ 14 min après émission)
 * - Affiche carte (recto + flip verso), grid usages, CTAs
 * - Tracking au mount : `centre_my_card_viewed`
 *
 * GUIC-391 (Lot 7) : inline styles remplacés par primitives `<Card>`,
 * classes Tailwind + tokens `gj-*`. Composant local `<CtaLink>` pour
 * les 2 CTAs (Link bouton-like).
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
          className="text-fs-800 font-black m-0 text-color-text-primary"
        >
          Ma carte CJS
        </h1>
        <p className="m-0 text-fs-200 text-color-text-muted">
          Présente ton QR à l’accueil d’un centre CJS pour valider ta présence.
        </p>

        {/* Shadow d'élévation conservée en inline — pas de token shadow XL équivalent. */}
        <div style={{ boxShadow: '0 12px 32px rgba(0,0,0,.18)', borderRadius: 16 }}>
          <CJSCardFlip
            user={user}
            cjsUid={cjsUid}
            qrToken={qr.token}
            qrExpiresAt={qr.expiresAt}
          />
        </div>

        {/* État QR — Card primitive (default = surface + border + radius) */}
        <Card
          aria-live="polite"
          data-testid="qr-status"
          padded={false}
          className="flex flex-col gap-1 px-3 py-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-fs-100 font-black text-color-text-primary">
              {qr.loading
                ? 'Génération du QR…'
                : qr.error
                  ? 'QR indisponible'
                  : `QR valide encore ${remainingMin} min`}
            </span>
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={fetchToken}
              disabled={qr.loading}
              aria-label="Rafraîchir le QR"
              className="text-fs-100"
            >
              <Icon name="arrow-up" size={14} />
              Rafraîchir
            </Button>
          </div>
          <div
            aria-hidden="true"
            className="h-1 rounded-full overflow-hidden bg-gj-bg"
          >
            <div
              data-testid="qr-progress"
              className="h-full transition-[width] duration-1000 ease-linear"
              style={{
                // width dynamique → reste en inline (pas une classe utility)
                width: `${progressPct}%`,
                background:
                  progressPct < 15 ? 'var(--gj-red)' : 'var(--gj-teal-deep)',
              }}
            />
          </div>
        </Card>

        {/* Section 3 — CTAs (placés sous la carte pour mobile-first) */}
        <div className="flex flex-col sm:flex-row gap-2">
          <CtaLink href="/jeune/mes-reservations-centres" variant="primary" icon="bookmark">
            Mes réservations
          </CtaLink>
          <CtaLink href="/centres" variant="yellow" icon="plus">
            Réserver une ressource
          </CtaLink>
        </div>
      </section>

      {/* Section 2 — Usages récents */}
      <section aria-labelledby="usages-title" className="flex flex-col gap-3">
        <h2
          id="usages-title"
          className="text-fs-600 font-black m-0 text-color-text-primary"
        >
          Tes derniers usages
        </h2>
        <MesUsagesGrid usages={usages} />
      </section>
    </div>
  )
}
