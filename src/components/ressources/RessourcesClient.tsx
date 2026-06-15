'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input, Chip, EmptyState, Icon, Button, Toast } from '@/components/ui'
import { ResourceCard } from './ResourceCard'
import {
  RessourcesFiltersSheet,
  countActiveFilters,
  type RessourcesFiltresValue,
} from './RessourcesFiltersSheet'
import type {
  RessourceListItem,
  RessourceFiltres,
  TypeRessourceValue,
} from '@/lib/loaders/ressources'

interface RessourcesClientProps {
  initialItems: RessourceListItem[]
  total: number
  page: number
  pageSize: number
  initialFilters: RessourceFiltres
}

const FILTRES: { value: TypeRessourceValue | 'all'; label: string }[] = [
  { value: 'all',   label: 'Toutes' },
  { value: 'PDF',   label: 'PDF' },
  { value: 'Video', label: 'Vidéos' },
  { value: 'Lien',  label: 'Liens' },
  { value: 'Guide', label: 'Guides' },
  { value: 'Outil', label: 'Outils' },
]

/**
 * UI client — recherche + filtres principaux + bottom-sheet de filtres avancés
 * + favoris ressources (GUIC-24).
 *
 * GUIC-24 B1 : tous les filtres passent désormais côté serveur via searchParams.
 * Le state des filtres vit dans l'URL ; ce composant pousse les changements
 * via router.push() (debounce 300 ms pour la recherche texte). "Charger plus"
 * navigue vers ?page=N+1 et agrège côté client via append sur changement de page.
 */
export function RessourcesClient({
  initialItems,
  total,
  page,
  initialFilters,
}: RessourcesClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // ── State local "input" recherche (debounced vers URL) ─────────────────
  const [query, setQuery] = useState(initialFilters.q ?? '')

  // ── Aggrégation des pages (Charger plus) ───────────────────────────────
  // On garde une liste cumulée d'items pour les pages > 1.
  const [accumulated, setAccumulated] = useState<RessourceListItem[]>(initialItems)
  const prevPageRef = useRef<number>(page)
  const prevFiltersKeyRef = useRef<string>(JSON.stringify(initialFilters))

  useEffect(() => {
    const key = JSON.stringify(initialFilters)
    const filtersChanged = key !== prevFiltersKeyRef.current
    if (filtersChanged || page === 1) {
      setAccumulated(initialItems)
    } else if (page > prevPageRef.current) {
      // Page suivante : on append, en dédupliquant par id.
      setAccumulated((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...initialItems.filter((i) => !seen.has(i.id))]
      })
    } else {
      // Cas de repli (back/forward).
      setAccumulated(initialItems)
    }
    prevPageRef.current = page
    prevFiltersKeyRef.current = key
  }, [initialItems, page, initialFilters])

  // ── Favoris ────────────────────────────────────────────────────────────
  const [favoriIds, setFavoriIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    let cancelled = false
    fetch('/api/favoris/ressources/ids', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.data) return
        setFavoriIds(new Set<string>(j.data as string[]))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // ── Helpers d'écriture dans l'URL ──────────────────────────────────────
  const buildParams = useCallback(
    (mut: (p: URLSearchParams) => void): URLSearchParams => {
      const params = new URLSearchParams(sp?.toString() ?? '')
      mut(params)
      return params
    },
    [sp],
  )

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString()
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [router, pathname],
  )

  const setSingle = useCallback(
    (key: string, value: string | null) => {
      const params = buildParams((p) => {
        if (value === null || value === '') p.delete(key)
        else p.set(key, value)
        p.delete('page')
      })
      pushParams(params)
    },
    [buildParams, pushParams],
  )

  // ── Debounce recherche texte ───────────────────────────────────────────
  useEffect(() => {
    const trimmed = query.trim()
    const current = (initialFilters.q ?? '').trim()
    if (trimmed === current) return
    const t = setTimeout(() => {
      setSingle('q', trimmed || null)
    }, 300)
    return () => clearTimeout(t)
  }, [query, initialFilters.q, setSingle])

  // ── Vue dérivée des filtres avancés depuis initialFilters ──────────────
  const advanced: RessourcesFiltresValue = useMemo(
    () => ({
      type: initialFilters.type,
      niveau: initialFilters.niveau,
      langue: initialFilters.langue,
      categories: initialFilters.categories,
      date: initialFilters.date,
    }),
    [initialFilters],
  )

  const categoriesOptions = useMemo(
    () =>
      Array.from(
        new Set(
          accumulated
            .map((r) => r.categorie)
            .filter((c): c is string => Boolean(c && c.trim())),
        ),
      ).sort(),
    [accumulated],
  )

  const [sheetOpen, setSheetOpen] = useState(false)

  const activeAdvanced = countActiveFilters(advanced)
  const currentType = initialFilters.type ?? 'all'
  const hasActiveFilters =
    activeAdvanced > 0 || currentType !== 'all' || (initialFilters.q?.trim().length ?? 0) > 0

  // ── Pagination ─────────────────────────────────────────────────────────
  const loadedCount = accumulated.length
  const hasMore = loadedCount < total
  const loadMore = () => {
    const params = buildParams((p) => {
      p.set('page', String(page + 1))
    })
    pushParams(params)
  }

  // ── Favoris ────────────────────────────────────────────────────────────
  // GUIC-367 — toast feedback (ajout / retrait / erreur).
  const [favToast, setFavToast] = useState<
    { message: string; variant: 'success' | 'danger' } | null
  >(null)

  const handleToggleFavori = async (id: string) => {
    const wasFavori = favoriIds.has(id)
    setFavoriIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Feedback optimiste immédiat.
    setFavToast({
      message: wasFavori ? 'Retiré des favoris' : 'Ajouté aux favoris',
      variant: 'success',
    })
    try {
      const res = await fetch(`/api/ressources/${id}/favori`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 401) {
        setFavoriIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        router.push('/auth/connexion')
        return
      }
      if (!res.ok) throw new Error('toggle failed')
    } catch {
      setFavoriIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      setFavToast({ message: 'Action impossible, réessayez', variant: 'danger' })
    }
  }

  const resetAll = () => {
    setQuery('')
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }

  const onApplyAdvanced = (next: RessourcesFiltresValue) => {
    const params = buildParams((p) => {
      // Type
      if (next.type) p.set('type', next.type)
      else if (!initialFilters.type) p.delete('type')
      else p.delete('type')
      // Niveau
      if (next.niveau) p.set('niveau', next.niveau)
      else p.delete('niveau')
      // Langue
      if (next.langue) p.set('langue', next.langue)
      else p.delete('langue')
      // Catégories (multi)
      p.delete('categorie')
      if (next.categories && next.categories.length) {
        for (const c of next.categories) p.append('categorie', c)
      }
      // Date
      if (next.date && next.date !== 'all') p.set('date', next.date)
      else p.delete('date')
      // Reset pagination
      p.delete('page')
    })
    pushParams(params)
  }

  const setType = (value: TypeRessourceValue | 'all') => {
    setSingle('type', value === 'all' ? null : value)
  }

  return (
    <div className="flex flex-col gap-space-4" aria-busy={isPending}>
      <div className="flex flex-col gap-space-3">
        <div className="relative">
          <span className="absolute left-space-3 top-1/2 -translate-y-1/2 text-color-text-muted pointer-events-none">
            <Icon name="search" size={18} />
          </span>
          <Input
            type="search"
            placeholder="Rechercher une ressource…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher une ressource"
            className="pl-[44px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-space-2" role="group" aria-label="Filtres par type">
          {FILTRES.map((f) => (
            <Chip
              key={f.value}
              selected={currentType === f.value}
              onClick={() => setType(f.value)}
            >
              {f.label}
            </Chip>
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Ouvrir les filtres avancés"
            data-testid="open-advanced-filters"
            className="inline-flex items-center gap-1 px-space-3 py-[8px] rounded-gj-pill
              text-fs-200 font-black border-[1.5px] border-gj-line bg-gj-surface text-gj-grey
              hover:border-gj-line-strong min-h-[var(--tap-min)] md:min-h-[36px]
              focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]"
          >
            <Icon name="filter" size={14} />
            Filtres
            {activeAdvanced > 0 && (
              <span
                aria-hidden
                className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px]
                  px-1 rounded-full bg-gj-teal text-white text-fs-100 font-black"
              >
                {activeAdvanced}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-fs-200 text-color-text-secondary">
          <span data-testid="results-count">
            {total} résultat{total > 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAll}
              className="text-fs-200 font-black text-gj-grey hover:text-gj-ink"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {accumulated.length === 0 ? (
        <EmptyState
          icon="document"
          title="Aucune ressource trouvée"
          description={
            total === 0 && !hasActiveFilters
              ? 'Aucune ressource publiée pour le moment. Revenez bientôt.'
              : 'Aucune ressource ne correspond à votre recherche.'
          }
          actionLabel="Voir les opportunités"
          onAction={() => router.push('/opportunites')}
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-space-3 list-none p-0 m-0">
            {accumulated.map((r) => (
              <li key={r.id}>
                <ResourceCard
                  item={r}
                  isFavori={favoriIds.has(r.id)}
                  onToggleFavori={handleToggleFavori}
                />
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="flex justify-center mt-space-2">
              <Button
                variant="ghost"
                onClick={loadMore}
                disabled={isPending}
                aria-label="Charger plus de ressources"
              >
                {isPending ? 'Chargement…' : 'Charger plus'}
              </Button>
            </div>
          )}
        </>
      )}

      <RessourcesFiltersSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={advanced}
        categoriesOptions={categoriesOptions}
        totalCount={total}
        onApply={onApplyAdvanced}
      />

      {favToast && (
        <Toast
          message={favToast.message}
          variant={favToast.variant}
          bottomOffset={72}
          onClose={() => setFavToast(null)}
        />
      )}
    </div>
  )
}

