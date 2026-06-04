'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { TypeOpportunite } from '@prisma/client'
import { Button, EmptyState, Input, SkeletonCard } from '@/components/ui'
import { OppCard } from './OppCard'
import { typeLabel } from './OpportuniteTypeChip'
import { FiltresPanel, type FiltresValue } from './FiltresPanel'
import { OpportunitesFiltersSheet } from './OpportunitesFiltersSheet'
import { useFavoris } from './FavorisProvider'
import type { OpportuniteListItem, OpportuniteSortBy } from '@/types/opportunite'

/** Types disponibles dans la rangée horizontale de chips (mobile). */
const TYPE_CHIPS: TypeOpportunite[] = [
  'Emploi',
  'Stage',
  'Formation',
  'Bourse',
  'Volontariat',
  'Appel_a_projets',
]

interface OpportunitesClientProps {
  initialRegion: string | null
}

type Filters = FiltresValue & { q: string }
type Status = 'idle' | 'loading' | 'loadingMore' | 'error'

function readFilters(sp: URLSearchParams): Filters {
  return {
    q: sp.get('q') ?? '',
    domaine: sp.get('domaine') ?? undefined,
    type: sp.get('type') ?? undefined,
    region: sp.get('region') ?? undefined,
    sortBy: (sp.get('sort_by') === 'deadline' ? 'deadline' : 'recent') as OpportuniteSortBy,
  }
}

/** Query string de l'URL (sans la page — le scroll infini ne la persiste pas). */
function urlQuery(f: Filters): string {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.domaine) p.set('domaine', f.domaine)
  if (f.type) p.set('type', f.type)
  if (f.region) p.set('region', f.region)
  if (f.sortBy !== 'recent') p.set('sort_by', f.sortBy)
  return p.toString()
}

function apiQuery(f: Filters, page: number): string {
  const base = urlQuery(f)
  const p = new URLSearchParams(base)
  if (page > 1) p.set('page', String(page))
  return p.toString()
}

export function OpportunitesClient({ initialRegion }: OpportunitesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const filtersKey = urlQuery(filters)
  const { has: isFavori, toggle: toggleFavori } = useFavoris()

  const [items, setItems] = useState<OpportuniteListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<Status>('loading')
  const [searchInput, setSearchInput] = useState(filters.q)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const prefilterDone = useRef(false)

  /** Pré-filtre doux : applique la région du profil au premier chargement (UX F3). */
  useEffect(() => {
    if (prefilterDone.current) return
    prefilterDone.current = true
    if (!searchParams.get('region') && initialRegion) {
      router.replace(`/opportunites?region=${initialRegion}`, { scroll: false })
    }
  }, [searchParams, initialRegion, router])

  const pushFilters = useCallback(
    (next: Filters) => {
      const qs = urlQuery(next)
      router.replace(qs ? `/opportunites?${qs}` : '/opportunites', { scroll: false })
    },
    [router],
  )

  /** Recherche : debounce 300 ms avant de pousser `q` dans l'URL. */
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchInput.trim() !== filters.q.trim()) {
        pushFilters({ ...filters, q: searchInput })
      }
    }, 300)
    return () => clearTimeout(id)
  }, [searchInput, filters, pushFilters])

  /** Chargement de la première page à chaque changement de filtres. */
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setPage(1)
    fetch(`/api/opportunites?${filtersKey}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body) => {
        if (cancelled) return
        setItems(body.data ?? [])
        setTotal(body.meta?.total ?? 0)
        setStatus('idle')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [filtersKey])

  const loadMore = useCallback(() => {
    if (status !== 'idle' || items.length >= total) return
    const nextPage = page + 1
    setStatus('loadingMore')
    fetch(`/api/opportunites?${apiQuery(filters, nextPage)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body) => {
        setItems((prev) => [...prev, ...(body.data ?? [])])
        setPage(nextPage)
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [status, items.length, total, page, filters])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  const resetFilters = () => {
    setSearchInput('')
    router.replace('/opportunites', { scroll: false })
  }

  const hasFilters = Boolean(filters.q || filters.domaine || filters.type || filters.region)
  const activeFilterCount = [filters.domaine, filters.type, filters.region].filter(Boolean).length
  const showRegionBanner = Boolean(filters.region && filters.region === initialRegion)

  return (
    <div>
      {/* Barre de recherche */}
      <div className="mb-space-3">
        <label htmlFor="opp-search" className="sr-only">
          Rechercher une opportunité
        </label>
        <Input
          id="opp-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Rechercher un emploi, un stage, une bourse…"
          prefixIcon="search"
        />
        <p className="text-fs-200 text-color-text-secondary mt-space-1" aria-live="polite">
          {status === 'loading' ? 'Recherche…' : `${total} opportunité${total > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Bandeau pré-filtre région */}
      {showRegionBanner && (
        <div className="mb-space-3 flex items-center justify-between gap-space-2
          bg-gj-teal-soft text-gj-teal-deep rounded-gj-md px-space-3 py-space-2">
          <span className="text-fs-200">
            Opportunités dans la région : {filters.region?.replace(/_/g, ' ')}
          </span>
          <button
            type="button"
            onClick={() => pushFilters({ ...filters, region: undefined })}
            className="text-fs-200 font-bold underline shrink-0"
          >
            Voir tout le Sénégal
          </button>
        </div>
      )}

      {/* Rangée horizontale de chips types — mobile uniquement (design v2 M1). */}
      <div
        className="lg:hidden -mx-space-3 mb-space-3 px-space-3 flex gap-space-1 overflow-x-auto
          snap-x snap-mandatory scrollbar-none"
        role="tablist"
        aria-label="Filtrer par type d'opportunité"
      >
        {TYPE_CHIPS.map((t) => {
          const active = filters.type === t
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() =>
                pushFilters({ ...filters, type: active ? undefined : t })
              }
              className={[
                'snap-start shrink-0 inline-flex items-center px-space-3 py-[7px] rounded-gj-pill',
                'text-fs-200 leading-none whitespace-nowrap border-[1.5px]',
                'min-h-[var(--tap-min)] md:min-h-[36px]',
                'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
                active
                  ? 'bg-gj-teal-soft border-gj-teal text-gj-teal-deep font-black'
                  : 'bg-gj-surface border-gj-line text-gj-grey hover:border-gj-line-strong font-semibold',
              ].join(' ')}
            >
              {typeLabel(t)}
            </button>
          )
        })}
      </div>

      {/* Bouton filtres avancés — mobile */}
      <div className="lg:hidden mb-space-3">
        <Button variant="ghost" size="md" onClick={() => setFiltersOpen(true)}>
          Filtres avancés{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Button>
      </div>

      {/* Layout desktop conforme design v2 (lot3-opps-web.jsx#WebOppList) :
          sidebar filtres 280px à gauche + liste 1-col à droite. Mobile : sheet. */}
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-space-5">
        {/* Panneau filtres — desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-space-4">
            <FiltresPanel
              value={filters}
              onChange={(next) => pushFilters({ ...filters, ...next })}
              onReset={resetFilters}
            />
          </div>
        </aside>

        {/* Liste de résultats — 1 colonne en desktop (conforme design v2) */}
        <div className="flex-1 min-w-0">
          {status === 'loading' && (
            <div className="grid grid-cols-1 gap-space-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="bg-gj-red-soft text-gj-red-ink rounded-gj-md p-space-4 text-fs-300">
              Une erreur est survenue.{' '}
              <button
                type="button"
                onClick={() => router.refresh()}
                className="font-bold underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {status !== 'loading' && status !== 'error' && items.length === 0 && (
            <EmptyState
              title={hasFilters ? 'Aucun résultat' : 'Aucune opportunité pour le moment'}
              description={
                hasFilters
                  ? 'Aucune opportunité ne correspond à votre recherche.'
                  : 'Revenez bientôt, de nouvelles opportunités sont publiées régulièrement.'
              }
              actionLabel={hasFilters ? 'Réinitialiser les filtres' : undefined}
              onAction={hasFilters ? resetFilters : undefined}
            />
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-1 gap-space-3">
              {items.map((item) => (
                <OppCard
                  key={item.id}
                  item={item}
                  isFavori={isFavori(item.id)}
                  onToggleFavori={toggleFavori}
                />
              ))}
            </div>
          )}

          {/* Sentinelle de scroll infini */}
          {items.length < total && (
            <div ref={sentinelRef} className="py-space-4 text-center">
              {status === 'loadingMore' && (
                <span className="text-fs-200 text-color-text-secondary">Chargement…</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filtres avancés — bottom-sheet mobile (GUIC-188) */}
      <OpportunitesFiltersSheet
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        totalCount={total}
        onApply={(next) => {
          // Préserve la recherche `q` portée par le state local + URL.
          pushFilters({ ...filters, ...next })
        }}
      />
    </div>
  )
}
