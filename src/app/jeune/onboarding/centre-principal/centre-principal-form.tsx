'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface CentrePrincipalOption {
  id: string
  nom: string
  region: string
  ville: string
}

export interface CentrePrincipalFormProps {
  centres: CentrePrincipalOption[]
  suggestedId: string | null
  userRegion: string | null
}

function track(type: string, metadata: Record<string, unknown>) {
  try {
    void fetch('/api/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, metadata }),
      keepalive: true,
    })
  } catch {
    /* silencieux */
  }
}

/**
 * Formulaire onboarding "Centre principal" (Lot 7 W2).
 *
 * Pré-sélectionne l'id suggéré (centre de la région SSO). 2 CTAs :
 *  - "Continuer" : POST `/api/profil/centre-principal` puis `/recommandations`.
 *  - "Passer cette étape" : POST avec `centreId: null` puis `/recommandations`.
 */
export function CentrePrincipalForm({
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
        setError(body?.error?.message ?? 'Une erreur est survenue.')
        setLoading(false)
        return
      }
      if (centreId) {
        track('centre_filter_applied', {
          source: 'onboarding',
          centreId,
        })
      }
      router.push('/jeune/onboarding/recommandations')
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
      setLoading(false)
    }
  }

  return (
    <main role="main" className="min-h-[100dvh] bg-gj-bg flex flex-col">
      <div className="mx-auto w-full max-w-md px-space-4 pt-space-5 pb-space-6 flex flex-col gap-space-4">
        <header>
          <h1 className="text-fs-500 font-black m-0" style={{ color: 'var(--gj-ink, #0E1A1F)' }}>
            Choisis ton centre CJS principal
          </h1>
          <p className="text-fs-200 mt-1" style={{ color: 'var(--gj-grey, #65706B)' }}>
            On t&apos;a suggéré le centre de ta région — tu peux le changer à tout moment dans ton profil.
          </p>
        </header>

        <label className="flex flex-col gap-2">
          <span className="text-fs-200 font-bold" style={{ color: 'var(--gj-ink, #0E1A1F)' }}>
            Centre CJS
          </span>
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
            aria-label="Sélectionner un centre CJS"
            className="w-full px-3 py-3 rounded-gj-md text-fs-200"
            style={{
              background: 'var(--gj-surface, #fff)',
              border: '1px solid var(--gj-line, #DDE3E1)',
              minHeight: 44,
            }}
            disabled={loading}
          >
            <option value="">— Aucun centre principal —</option>
            {centres.map((c) => {
              const inMyRegion = userRegion && c.region === userRegion
              return (
                <option key={c.id} value={c.id}>
                  {c.nom} — {c.ville}
                  {inMyRegion ? ' (ta région)' : ''}
                </option>
              )
            })}
          </select>
        </label>

        {error && (
          <p
            role="alert"
            className="text-fs-200 px-3 py-2 rounded-gj-sm"
            style={{
              color: 'var(--gj-red, #D7263D)',
              background: 'var(--gj-red-soft, #FDECEE)',
            }}
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 mt-space-2">
          <button
            type="button"
            disabled={loading || !selectedId}
            onClick={() => submit(selectedId)}
            className="w-full px-4 py-3 rounded-gj-md text-fs-200 font-bold disabled:opacity-50"
            style={{
              background: 'var(--gj-teal-deep, #0A2A24)',
              color: '#fff',
              minHeight: 44,
            }}
          >
            {loading ? 'Enregistrement…' : 'Continuer'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => submit(null)}
            className="w-full px-4 py-3 rounded-gj-md text-fs-200 font-medium"
            style={{
              background: 'transparent',
              color: 'var(--gj-grey, #65706B)',
              minHeight: 44,
            }}
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </main>
  )
}
