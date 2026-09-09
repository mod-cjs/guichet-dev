'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { TypeOpportunite } from '@prisma/client'
import { EmptyState, Icon, Input, Pagination, SkeletonCard } from '@/components/ui'
import type { EmptyStateAction } from '@/components/ui/EmptyState'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { useYayePanel } from '@/components/yaye/YayeProvider'
import { OppCard } from './OppCard'
import { typeLabel } from './OpportuniteTypeChip'
import { FiltresPanel, type FiltresValue } from './FiltresPanel'
import { OpportunitesFiltersSheet } from './OpportunitesFiltersSheet'
import { OpportunitesListHeader, type ActiveChip } from './OpportunitesListHeader'
import { useFavoris } from './FavorisProvider'
import { regionLabel } from '@/lib/regions'
import type { OpportuniteListItem, OpportuniteSortBy } from '@/types/opportunite'
import { libelleDomaine } from '@/lib/domaines'
import type { Domaine } from '@prisma/client'

interface OpportunitesClientProps {
  initialRegion: string | null
  /** GUIC-684 — programmes actifs proposés au filtrage (source : table Programme). */
  programmes?: { slug: string; nom: string }[]
}

type Filters = FiltresValue & { q: string }
type Status = 'idle' | 'loading' | 'loadingMore' | 'error'

// GUIC-689 — `remuneration` et `deadline` sont portés par l'URL et lus par
// l'API/le loader (voir `opportunites-loader.ts`) : ce ne sont plus des filtres
// décoratifs.
function readFilters(sp: URLSearchParams): Filters {
  return {
    q: sp.get('q') ?? '',
    domaine: sp.get('domaine') ?? undefined,
    type: sp.get('type') ?? undefined,
    region: sp.get('region') ?? undefined,
    programme: sp.get('programme') ?? undefined,
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
  if (f.programme) p.set('programme', f.programme)
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

export function OpportunitesClient({ initialRegion, programmes = [] }: OpportunitesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const filtersKey = urlQuery(filters)
  const { has: isFavori, toggle: toggleFavori } = useFavoris()
  const yaye = useYayePanel()

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
      filters.programme ||
      filters.remuneration ||
      filters.deadline,
  )
  const activeFilterCount = [
    filters.domaine,
    filters.type,
    filters.region,
    filters.programme,
    filters.remuneration,
    filters.deadline,
  ].filter(Boolean).length
  const showRegionBanner = Boolean(filters.region && filters.region === initialRegion)

  // GUIC-689 (Lot P3-A) — actions de l'état vide (design v5
  // `lot3-opps-web.jsx#WebEmptyState` L.783-793) : "Élargir la région" ne
  // s'affiche que si un filtre région est réellement actif — un bouton qui
  // ne changerait rien serait un bouton mort.
  const emptyStateActions: EmptyStateAction[] = hasFilters
    ? [
        ...(filters.region
          ? [
              {
                label: 'Élargir la région',
                onClick: () => pushFilters({ ...filters, region: undefined }),
                variant: 'outline' as const,
              },
            ]
          : []),
        { label: 'Réinitialiser les filtres', onClick: resetFilters, variant: 'primary' as const },
      ]
    : []

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
      // GUIC-689 — libellé de la source unique : `replace('_')` laissait
      // passer « BienEtre » et « Employabilite » tels quels à l'écran.
      label: libelleDomaine(filters.domaine as Domaine),
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
  if (filters.programme) {
    activeChips.push({
      key: `prog-${filters.programme}`,
      label: programmes.find((p) => p.slug === filters.programme)?.nom ?? filters.programme,
      onRemove: () => pushFilters({ ...filters, programme: undefined }),
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

        {/* Bouton filtres mobile — icône filtre + badge pill count (GUIC-460 F24) */}
        <div className="mb-space-3">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={`Filtres${activeFilterCount > 0 ? ` (${activeFilterCount} actifs)` : ''}`}
            className="relative inline-flex items-center justify-center gap-space-2
              min-h-[var(--tap-min)] px-space-3 rounded-gj-md
              border-[1.5px] border-gj-line bg-white text-gj-teal-deep
              font-bold text-fs-300 cursor-pointer hover:bg-gj-teal-soft
              transition-colors duration-200"
          >
            <Icon name="filter" size={18} aria-hidden />
            <span>Filtres</span>
            {activeFilterCount > 0 && (
              <span
                data-testid="filters-badge"
                className="inline-flex items-center justify-center
                  min-w-[20px] h-[20px] px-[5px] rounded-full
                  bg-gj-teal-deep text-white text-fs-100 font-extrabold leading-none"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Layout desktop conforme design v2 (lot3-opps-web.jsx#WebOppList) :
          sidebar filtres 280px à gauche + liste à droite. */}
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-space-5">
        {/* Panneau filtres — desktop */}
        <aside className="hidden lg:block">
          {/* Sticky coordonné avec BenefTopBar (--gj-topbar-h = 64px) — GUIC-401. */}
          <div className="sticky top-[var(--gj-sticky-offset)]">
            <FiltresPanel
              value={filters}
              onChange={(next) => pushFilters({ ...filters, ...next })}
              onReset={resetFilters}
              resultsCount={total}
              programmes={programmes}
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
            className="mb-space-3"
          />

          {status === 'loading' && (
            <div className="grid grid-cols-1 gap-space-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {status === 'error' && (
            <EmptyState
              illustration="error"
              title="Une erreur est survenue"
              description="Le chargement des opportunités a échoué. Réessaie dans un instant."
              actionLabel="Réessayer"
              onAction={() => router.refresh()}
            />
          )}

          {status !== 'loading' && status !== 'error' && items.length === 0 && (
            <div className="flex flex-col items-center gap-space-3">
              <EmptyState
                title={hasFilters ? 'Aucun résultat' : 'Aucune opportunité pour le moment'}
                description={
                  hasFilters
                    ? 'Aucune opportunité ne correspond à votre recherche.'
                    : 'Revenez bientôt, de nouvelles opportunités sont publiées régulièrement.'
                }
                actions={emptyStateActions.length > 0 ? emptyStateActions : undefined}
              />
              {/* GUIC-689 (Lot P3-A) — bandeau Yaye (design v5 `WebEmptyState`
                  L.796-810 / `MobileEmptyState` L.681-692) : `EmptyState` reste
                  une primitive générique non couplée à Yaye, le bandeau est
                  rendu ici, à côté, et ouvre le panneau existant (GUIC-376). */}
              <button
                type="button"
                onClick={yaye.open}
                aria-haspopup="dialog"
                className="flex items-center gap-space-3 text-left w-full max-w-[440px]
                  bg-gj-teal-soft border-[1.5px] border-gj-line rounded-gj-md p-space-3
                  cursor-pointer focus:outline-none focus-visible:ring-[3px]
                  focus-visible:ring-[var(--focus-ring-soft)]"
              >
                <YayeAvatar size={32} />
                <span className="flex-1 text-fs-200 text-color-text-primary leading-relaxed">
                  <b className="font-black">Yaye peut t&apos;aider :</b> dis-moi ce que tu cherches en
                  une phrase, je te trouve des opportunités proches.
                </span>
              </button>
            </div>
          )}

          {items.length > 0 && (
            /* Grand écran (≥1536px) : 2 colonnes — cards opps denses, max 2 cols. */
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-space-3">
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
        programmes={programmes}
        onApply={(next) => {
          pushFilters({ ...filters, ...next })
        }}
      />
    </div>
  )
}
