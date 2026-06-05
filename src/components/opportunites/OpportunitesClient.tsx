'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { TypeOpportunite } from '@prisma/client'
import { Button, EmptyState, Input, Pagination, SkeletonCard } from '@/components/ui'
import { OppCard } from './OppCard'
import { typeLabel } from './OpportuniteTypeChip'
import { FiltresPanel, type FiltresValue } from './FiltresPanel'
import { OpportunitesFiltersSheet } from './OpportunitesFiltersSheet'
import { OpportunitesListHeader, type ActiveChip } from './OpportunitesListHeader'
import { useFavoris } from './FavorisProvider'
import { regionLabel } from '@/lib/regions'
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

// GUIC-251 — TODO loader : les filtres `remuneration` et `deadline` sont
// portés par l'URL et propagés à l'API, mais le schéma Zod actuel
// (`OpportuniteQuerySchema`) ne les valide pas — ils seront silencieusement
// ignorés côté serveur jusqu'à l'évolution du loader (épic dédié).
function readFilters(sp: URLSearchParams): Filters {
  return {
    q: sp.get('q') ?? '',
    domaine: sp.get('domaine') ?? undefined,
    type: sp.get('type') ?? undefined,
    region: sp.get('region') ?? undefined,
    remuneration:
      sp.get('remuneration') === 'yes' || sp.get('remuneration') === 'no'
        ? (sp.get('remuneration') as 'yes' | 'no')
        : undefined,
    deadline:
      sp.get('deadline') === '7' || sp.get('deadline') === '30'
        ? (sp.get('deadline') as '7' | '30')
        : undefined,
    sortBy: (sp.get('sort_by') === 'deadline' ? 'deadline' : 'recent') as OpportuniteSortBy,
  }
}

/** Query string de l'URL (sans page — gérée séparément). */
function urlQuery(f: Filters): string {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.domaine) p.set('domaine', f.domaine)
  if (f.type) p.set('type', f.type)
  if (f.region) p.set('region', f.region)
  if (f.remuneration) p.set('remuneration', f.remuneration)
  if (f.deadline) p.set('deadline', f.deadline)
  if (f.sortBy !== 'recent') p.set('sort_by', f.sortBy)
  return p.toString()
}

function apiQuery(f: Filters, page: number): string {
  const base = urlQuery(f)
  const p = new URLSearchParams(base)
  if (page > 1) p.set('page', String(page))
  return p.toString()
}

const PAGE_SIZE = 20

export function OpportunitesClient({ initialRegion }: OpportunitesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const filtersKey = urlQuery(filters)
  const { has: isFavori, toggle: toggleFavori } = useFavoris()

  // Page courante (desktop) — lue depuis l'URL.
  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1)

  const [items, setItems] = useState<OpportuniteListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<Status>('loading')
  const [searchInput, setSearchInput] = useState(filters.q)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [updatedAgo, setUpdatedAgo] = useState<string>('')

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
      // Reset page param on filter changes.
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

  /** Synchronise le champ recherche local quand l'URL change (ex. clear). */
  useEffect(() => {
    if (filters.q !== searchInput && document.activeElement?.id !== 'opp-search') {
      setSearchInput(filters.q)
    }
  }, [filters.q])

  /** Chargement à chaque changement de filtres OU page. */
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setPage(currentPage)
    fetch(`/api/opportunites?${apiQuery(filters, currentPage)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body) => {
        if (cancelled) return
        setItems(body.data ?? [])
        setTotal(body.meta?.total ?? 0)
        setStatus('idle')
        setUpdatedAgo("à l'instant")
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [filtersKey, currentPage])

  /** Met à jour le compteur "il y a X" toutes les 30 s. */
  useEffect(() => {
    if (status !== 'idle') return
    const start = Date.now()
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000)
      if (sec < 60) setUpdatedAgo("à l'instant")
      else if (sec < 3600) setUpdatedAgo(`il y a ${Math.floor(sec / 60)} min`)
      else setUpdatedAgo(`il y a ${Math.floor(sec / 3600)} h`)
    }, 30_000)
    return () => clearInterval(id)
  }, [status])

  // Scroll infini — mobile uniquement (desktop = pagination numérotée).
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
      // Mobile only (lg breakpoint = 1024).
      if (entries[0]?.isIntersecting && window.innerWidth < 1024) loadMore()
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  const resetFilters = () => {
    setSearchInput('')
    router.replace('/opportunites', { scroll: false })
  }

  const hasFilters = Boolean(
    filters.q ||
      filters.domaine ||
      filters.type ||
      filters.region ||
      filters.remuneration ||
      filters.deadline,
  )
  const activeFilterCount = [
    filters.domaine,
    filters.type,
    filters.region,
    filters.remuneration,
    filters.deadline,
  ].filter(Boolean).length
  const showRegionBanner = Boolean(filters.region && filters.region === initialRegion)

  // Chips actives pour le header desktop.
  const activeChips: ActiveChip[] = []
  if (filters.type) {
    activeChips.push({
      key: `type-${filters.type}`,
      label: typeLabel(filters.type as TypeOpportunite),
      onRemove: () => pushFilters({ ...filters, type: undefined }),
    })
  }
  if (filters.domaine) {
    activeChips.push({
      key: `dom-${filters.domaine}`,
      label: filters.domaine.replace(/_/g, ' '),
      onRemove: () => pushFilters({ ...filters, domaine: undefined }),
    })
  }
  if (filters.region) {
    activeChips.push({
      key: `reg-${filters.region}`,
      label: regionLabel(filters.region) ?? filters.region,
      onRemove: () => pushFilters({ ...filters, region: undefined }),
    })
  }
  if (filters.remuneration) {
    activeChips.push({
      key: `rem-${filters.remuneration}`,
      label: filters.remuneration === 'yes' ? 'Rémunéré' : 'Non rémunéré',
      onRemove: () => pushFilters({ ...filters, remuneration: undefined }),
    })
  }
  if (filters.deadline) {
    activeChips.push({
      key: `dl-${filters.deadline}`,
      label: `J-${filters.deadline}`,
      onRemove: () => pushFilters({ ...filters, deadline: undefined }),
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginationBase = filtersKey ? `/opportunites?${filtersKey}` : '/opportunites'

  return (
    <div>
      {/* Bandeau pré-filtre région */}
      {showRegionBanner && (
        <div className="mb-space-3 flex items-center justify-between gap-space-2
          bg-gj-teal-soft text-gj-teal-deep rounded-gj-md px-space-3 py-space-2">
          <span className="text-fs-200">
            Opportunités dans la région : {regionLabel(filters.region) ?? filters.region}
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

      {/* === Mobile : search input + chips horizontaux + bouton filtres === */}
      <div className="lg:hidden">
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

        {/* Rangée horizontale de chips types — mobile uniquement (design v2 M1). */}
        <div
          className="-mx-space-3 mb-space-3 px-space-3 flex gap-space-1 overflow-x-auto
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

        <div className="mb-space-3">
          <Button variant="ghost" size="md" onClick={() => setFiltersOpen(true)}>
            Filtres avancés{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>
      </div>

      {/* Layout desktop conforme design v2 (lot3-opps-web.jsx#WebOppList) :
          sidebar filtres 280px à gauche + liste à droite. */}
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-space-5">
        {/* Panneau filtres — desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-space-4">
            <FiltresPanel
              value={filters}
              onChange={(next) => pushFilters({ ...filters, ...next })}
              onReset={resetFilters}
              resultsCount={total}
            />
          </div>
        </aside>

        {/* Liste de résultats — 1 colonne en desktop */}
        <div className="flex-1 min-w-0">
          {/* En-tête desktop GUIC-249 */}
          <OpportunitesListHeader
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            sortBy={filters.sortBy}
            onSortChange={(s) => pushFilters({ ...filters, sortBy: s })}
            total={total}
            activeQuery={filters.q || undefined}
            activeChips={activeChips}
            updatedAgo={updatedAgo}
            className="mb-space-4"
          />

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

          {/* === Desktop : pagination numérotée (GUIC-250) === */}
          {totalPages > 1 && status === 'idle' && (
            <div className="hidden lg:flex justify-between items-center pt-space-4 mt-space-4
              border-t border-gj-line">
              <p className="text-fs-200 text-color-text-secondary">
                Page <b className="text-color-text-primary">{currentPage}</b> sur {totalPages} ·
                résultats {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, total)} sur {total}
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                baseUrl={paginationBase}
              />
            </div>
          )}

          {/* === Mobile : scroll infini (sentinelle masquée en desktop) === */}
          {items.length < total && (
            <div ref={sentinelRef} className="lg:hidden py-space-4 text-center">
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
          pushFilters({ ...filters, ...next })
        }}
      />
    </div>
  )
}
