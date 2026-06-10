'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CentresMapGoogle,
  CentreRegionFilter,
  CentreRow,
  CentreCardMobile,
  MyCJSCard,
  type CentreRowCentre,
} from '@/components/centres'
import { EmptyState } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'

export interface CentresAllCentre extends CentreRowCentre {
  latitude: number
  longitude: number
  isOpen: boolean
}

export interface CentresAllClientProps {
  centres: CentresAllCentre[]
  userCentrePrincipalId?: string | null
  userIsConnected: boolean
  /** Pour MyCJSCard compact si user connecté. */
  user?: {
    prenom: string
    nom: string
    matricule: string
    membreDepuis: string
    centrePrincipal?: { nom: string; region: string } | null
    photoUrl?: string | null
  }
}

function track(type: string, metadata: Record<string, unknown>) {
  // Fire-and-forget — endpoint W0 `/api/v1/track`
  try {
    void fetch('/api/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, metadata }),
      keepalive: true,
    })
  } catch {
    // silencieux
  }
}

/**
 * Vue `all` des centres CJS (Lot 7 W2).
 *
 * Layout adaptatif :
 *  - Desktop ≥ lg : grid 2 cols (carte gauche sticky + annuaire droite + hero MyCJSCard).
 *  - Mobile < lg  : empilement vertical (map → mini MyCJSCard → duo CTAs → chips → cards).
 *
 * Filtres : région (chips wrap, pas de scroll horizontal). Empty-state si filtres
 * trop restrictifs.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 2.
 */
export function CentresAllClient({
  centres,
  userCentrePrincipalId,
  userIsConnected,
  user,
}: CentresAllClientProps) {
  const router = useRouter()
  const [region, setRegion] = useState<string>('all')

  // Tracking page-view une fois
  useEffect(() => {
    track('centres_index_viewed', { source: 'direct' })
  }, [])

  const regionsList = useMemo(() => {
    const set = new Set(centres.map((c) => c.region))
    return Array.from(set).sort()
  }, [centres])

  const filtered = useMemo(() => {
    if (region === 'all') return centres
    return centres.filter((c) => c.region === region)
  }, [centres, region])

  const handleRegionChange = (v: string) => {
    setRegion(v)
    track('centre_filter_applied', { filter: 'region', value: v })
  }

  const handleCentreClick = (slug: string, id: string) => {
    track('centre_viewed', { centreId: id })
    router.push(`/centres/${slug}`)
  }

  const handlePinClick = (id: string) => {
    track('centre_map_pin_clicked', { centreId: id })
    const c = centres.find((x) => x.id === id)
    if (c) {
      track('centre_viewed', { centreId: id })
      router.push(`/centres/${c.slug}`)
    }
  }

  const handleCardOpen = () => {
    track('cjs_card_opened', { source: 'centres_index' })
  }

  // Premier centre pour le lien Ressources mobile (fallback /centres si vide)
  const firstSlug = centres[0]?.slug

  const subtitle = `${centres.length} centres dans tout le Sénégal · trouve le plus proche de toi.`

  const showLegend = userIsConnected && Boolean(user?.centrePrincipal)

  return (
    <main role="main" className="bg-gj-bg min-h-[100dvh] pb-space-6">
      {/* ──────────────── HEADER ──────────────── */}
      <header className="mx-auto max-w-screen-xl px-space-4 pt-space-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1
            className="text-fs-500 font-black m-0"
            style={{ color: 'var(--gj-ink)' }}
          >
            Centres CJS
          </h1>
          <p
            className="text-fs-200 mt-1"
            style={{ color: 'var(--gj-grey)' }}
          >
            {subtitle}
          </p>
        </div>

        {userIsConnected && (
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <a
              href="/jeune/mes-reservations"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-gj-md text-fs-200 font-bold"
              style={{
                border: '1px solid var(--gj-teal-deep)',
                color: 'var(--gj-teal-deep)',
                minHeight: 44,
              }}
            >
              <Icon name="calendar" size={16} />
              Mes réservations
            </a>
            <a
              href="/jeune/ma-carte"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-gj-md text-fs-200 font-bold"
              style={{
                background: 'var(--gj-teal-deep)',
                color: '#fff',
                minHeight: 44,
              }}
            >
              <Icon name="pin" size={16} />
              Ma carte CJS
            </a>
          </div>
        )}
      </header>

      {/* ──────────────── MOBILE (<lg) ──────────────── */}
      <div className="lg:hidden mx-auto max-w-screen-sm px-space-3 mt-space-3 flex flex-col gap-space-3">
        {/* 1. Map en premier (conforme centres-mobile.jsx) */}
        <CentresMapGoogle
          centres={centres.map((c) => ({
            id: c.id,
            nom: c.nom,
            latitude: c.latitude,
            longitude: c.longitude,
          }))}
          activeId={userCentrePrincipalId ?? undefined}
          onPinClick={handlePinClick}
          height={230}
          centresForList={centres.map((c) => ({
            id: c.id,
            nom: c.nom,
            region: c.region,
            slug: c.slug,
          }))}
        />

        {showLegend && (
          <div
            className="flex gap-space-3 text-fs-100 mt-space-2"
            style={{ color: 'var(--gj-grey)' }}
            aria-label="Légende de la carte"
          >
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, background: 'var(--gj-red)' }}
                aria-hidden="true"
              />
              Mon centre
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, background: 'var(--gj-teal-deep)' }}
                aria-hidden="true"
              />
              Autres centres
            </span>
          </div>
        )}

        {/* 2. MyCJSCard mini cliquable */}
        {userIsConnected && user && (
          <a
            href="/jeune/ma-carte"
            aria-label="Ouvrir ma carte CJS"
            onClick={handleCardOpen}
          >
            <MyCJSCard
              compact
              user={{
                prenom: user.prenom,
                nom: user.nom,
                matricule: user.matricule,
                membreDepuis: user.membreDepuis,
                centrePrincipal: user.centrePrincipal ?? undefined,
                photoUrl: user.photoUrl ?? undefined,
              }}
            />
          </a>
        )}

        {/* 3. Duo CTAs mobile */}
        <div className="grid grid-cols-2 gap-space-2 mt-space-3">
          {userIsConnected ? (
            <>
              <a
                href="/jeune/mes-reservations"
                className="inline-flex items-center justify-center gap-2 rounded-gj-md text-fs-200 font-bold"
                style={{
                  border: '1px solid var(--gj-teal-deep)',
                  color: 'var(--gj-teal-deep)',
                  background: 'var(--gj-surface)',
                  minHeight: 44,
                }}
              >
                <Icon name="calendar" size={16} />
                Mes réservations
              </a>
              <a
                href={firstSlug ? `/centres/${firstSlug}/ressources` : '/centres'}
                className="inline-flex items-center justify-center gap-2 rounded-gj-md text-fs-200 font-bold"
                style={{
                  border: '1px solid var(--gj-teal-deep)',
                  color: 'var(--gj-teal-deep)',
                  background: 'var(--gj-surface)',
                  minHeight: 44,
                }}
              >
                <Icon name="document" size={16} />
                Ressources
              </a>
            </>
          ) : (
            <>
              <a
                href={firstSlug ? `/centres/${firstSlug}/ressources` : '/centres'}
                className="inline-flex items-center justify-center gap-2 rounded-gj-md text-fs-200 font-bold"
                style={{
                  border: '1px solid var(--gj-teal-deep)',
                  color: 'var(--gj-teal-deep)',
                  background: 'var(--gj-surface)',
                  minHeight: 44,
                }}
              >
                <Icon name="document" size={16} />
                Ressources
              </a>
              <a
                href="/auth/connexion"
                className="inline-flex items-center justify-center gap-2 rounded-gj-md text-fs-200 font-bold"
                style={{
                  border: '1px solid var(--gj-teal-deep)',
                  color: 'var(--gj-teal-deep)',
                  background: 'var(--gj-surface)',
                  minHeight: 44,
                }}
              >
                <Icon name="user" size={16} />
                Connectez-vous
              </a>
            </>
          )}
        </div>

        <CentreRegionFilter
          regions={regionsList}
          value={region}
          onChange={handleRegionChange}
        />

        {filtered.length === 0 ? (
          <EmptyState
            title="Aucun centre trouvé"
            description="Modifie tes filtres pour voir d'autres centres."
          />
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Centres CJS">
            {filtered.map((c) => (
              <li key={c.id}>
                <CentreCardMobile
                  centre={{
                    id: c.id,
                    slug: c.slug,
                    nom: c.nom,
                    region: c.region,
                    ville: c.ville,
                    horaires: c.horaires,
                  }}
                  isMine={userCentrePrincipalId === c.id}
                  isOpen={c.isOpen}
                  onClick={() => handleCentreClick(c.slug, c.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ──────────────── DESKTOP (≥lg) ──────────────── */}
      <div
        className="hidden lg:grid mx-auto max-w-screen-xl gap-space-4 px-space-4 mt-space-4"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 480px' }}
      >
        <div className="flex flex-col gap-space-3 min-w-0 lg:sticky lg:top-space-4 lg:self-start">
          <CentresMapGoogle
            centres={centres.map((c) => ({
              id: c.id,
              nom: c.nom,
              latitude: c.latitude,
              longitude: c.longitude,
            }))}
            activeId={userCentrePrincipalId ?? undefined}
            onPinClick={handlePinClick}
            height={460}
            centresForList={centres.map((c) => ({
              id: c.id,
              nom: c.nom,
              region: c.region,
              slug: c.slug,
            }))}
          />
          {showLegend && (
            <div
              className="flex gap-space-3 text-fs-100 mt-space-2"
              style={{ color: 'var(--gj-grey)' }}
              aria-label="Légende de la carte"
            >
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--gj-red)' }}
                  aria-hidden="true"
                />
                Mon centre
              </span>
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--gj-teal-deep)' }}
                  aria-hidden="true"
                />
                Autres centres
              </span>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-space-3 min-w-0">
          {/* Hero MyCJSCard avec badge "Ouvrir ma carte" */}
          {userIsConnected && user && (
            <a
              href="/jeune/ma-carte"
              aria-label="Ouvrir ma carte CJS"
              className="relative block"
              onClick={handleCardOpen}
            >
              <MyCJSCard
                user={{
                  prenom: user.prenom,
                  nom: user.nom,
                  matricule: user.matricule,
                  membreDepuis: user.membreDepuis,
                  centrePrincipal: user.centrePrincipal ?? undefined,
                  photoUrl: user.photoUrl ?? undefined,
                }}
              />
              <span
                className="absolute inline-flex items-center gap-1"
                style={{
                  right: 8,
                  bottom: 8,
                  padding: '6px 10px',
                  background: 'var(--gj-teal-deep)',
                  color: 'var(--gj-yellow)',
                  fontWeight: 800,
                  fontSize: 11,
                  borderRadius: 999,
                }}
              >
                Ouvrir ma carte <Icon name="arrow-right" size={12} />
              </span>
            </a>
          )}

          <CentreRegionFilter
            regions={regionsList}
            value={region}
            onChange={handleRegionChange}
          />
          {filtered.length === 0 ? (
            <EmptyState
              title="Aucun centre trouvé"
              description="Modifie tes filtres pour voir d'autres centres."
            />
          ) : (
            <ul
              className="flex flex-col gap-space-2 max-h-[70vh] overflow-y-auto pr-1"
              aria-label="Annuaire des centres CJS"
            >
              {filtered.map((c) => (
                <li key={c.id}>
                  <CentreRow
                    centre={c}
                    isMine={userCentrePrincipalId === c.id}
                    isOpen={c.isOpen}
                    onClick={() => handleCentreClick(c.slug, c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  )
}
