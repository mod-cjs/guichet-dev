'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Select } from '@/components/ui/Select'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { OnboardingNavWeb } from './OnboardingNavWeb'
import type { CentrePrincipalFormProps } from '../centre-principal/centre-principal-form'

/**
 * Onboarding écran « Centre principal » — version WEB (GUIC-431).
 *
 * Calquée sur OnboardingProfilWeb / OnboardingObjectifsWeb : carte centrée 820px,
 * OnboardingNavWeb step=3/total=4, DS Select pour le choix du centre.
 *
 * Partage la même interface `CentrePrincipalFormProps` que le form mobile.
 * Logique de soumission : POST `/api/profil/centre-principal` → push recommandations.
 */
export function CentrePrincipalFormWeb({
  centres,
  suggestedId,
  userRegion,
}: CentrePrincipalFormProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(suggestedId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(centreId: string | null) {
    setError(null)
    setLoading(true)
    try {
      const r = await fetch('/api/profil/centre-principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centreId }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setError((body as { error?: { message?: string } })?.error?.message ?? 'Une erreur est survenue.')
        setLoading(false)
        return
      }
      router.push('/jeune/onboarding/recommandations')
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
      setLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-bg)' }}
    >
      <OnboardingNavWeb step={3} total={4} />
      <div
        className="flex-1 flex flex-col items-center"
        style={{ padding: '48px 24px 40px', overflowY: 'auto' }}
      >
        <div
          className="flex flex-col"
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 18,
            padding: '40px 56px',
            width: 'min(820px, 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,.04)',
            gap: 22,
          }}
        >
          <div>
            <h2
              className="font-black text-color-text-primary text-fs-700"
              style={{ lineHeight: 1.15, letterSpacing: '-.4px' }}
            >
              Choisis ton centre CJS principal
            </h2>
            <p className="text-gj-grey" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
              On t&apos;a suggéré le centre de ta région — tu peux le changer à tout moment dans ton profil.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="web-centre-select">Centre CJS</FieldLabel>
            <Select
              id="web-centre-select"
              aria-label="Centre CJS"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value || null)}
              options={centres.map((c) => {
                const inMyRegion = userRegion && c.region === userRegion
                return {
                  value: c.id,
                  label: `${c.nom} — ${c.ville}${inMyRegion ? ' (ta région)' : ''}`,
                }
              })}
              placeholder="— Aucun centre principal —"
              disabled={loading}
            />
          </div>

          {error ? (
            <p role="alert" className="text-gj-red" style={{ fontSize: 13 }}>
              {error}
            </p>
          ) : null}

          <div
            className="flex justify-between items-center"
            style={{ paddingTop: 12, borderTop: '1px solid var(--gj-line)' }}
          >
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1 font-bold"
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--gj-grey)',
                cursor: 'pointer',
                fontSize: 13.5,
              }}
            >
              <Icon name="chevron-left" size={14} aria-hidden /> Retour
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => { void submit(null) }}
                className="font-bold"
                style={{
                  background: 'var(--gj-surface)',
                  color: 'var(--gj-grey)',
                  border: '1.5px solid var(--gj-line)',
                  padding: '0 22px',
                  minHeight: 50,
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                Passer cette étape
              </button>
              <button
                type="button"
                disabled={loading || !selectedId}
                onClick={() => { void submit(selectedId) }}
                className="inline-flex items-center gap-2 font-black"
                style={{
                  background: 'var(--gj-teal-deep)',
                  color: 'var(--gj-surface)',
                  border: 0,
                  padding: '0 24px',
                  minHeight: 50,
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: loading || !selectedId ? 'not-allowed' : 'pointer',
                  opacity: loading || !selectedId ? 0.7 : 1,
                }}
              >
                {loading ? 'Enregistrement…' : 'Continuer'}
                <Icon name="arrow-right" size={14} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
