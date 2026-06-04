'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Chip, EmptyState, Icon, Button } from '@/components/ui'
import { ResourceCard } from './ResourceCard'
import {
  RessourcesFiltersSheet,
  countActiveFilters,
  type RessourcesFiltresValue,
} from './RessourcesFiltersSheet'
import type {
  RessourceListItem,
  TypeRessourceValue,
} from '@/lib/loaders/ressources'

interface RessourcesClientProps {
  initialItems: RessourceListItem[]
  total: number
}

const FILTRES: { value: TypeRessourceValue | 'all'; label: string }[] = [
  { value: 'all',   label: 'Toutes' },
  { value: 'PDF',   label: 'PDF' },
  { value: 'Video', label: 'Vidéos' },
  { value: 'Lien',  label: 'Liens' },
  { value: 'Guide', label: 'Guides' },
  { value: 'Outil', label: 'Outils' },
]

const PAGE_SIZE = 6

function matchAdvanced(item: RessourceListItem, f: RessourcesFiltresValue): boolean {
  if (f.niveau && item.niveau !== f.niveau) return false
  if (f.langue && item.langue !== f.langue) return false
  if (f.categories && f.categories.length) {
    if (!item.categorie || !f.categories.includes(item.categorie)) return false
  }
  if (f.date && f.date !== 'all') {
    const now = Date.now()
    const created = new Date(item.createdAt).getTime()
    if (f.date === 'recent') {
      if (created < now - 30 * 86_400_000) return false
    } else if (f.date === 'year') {
      const year = new Date().getFullYear()
      if (new Date(item.createdAt).getFullYear() !== year) return false
    }
  }
  return true
}

/**
 * UI client — recherche + filtres principaux + bottom-sheet de filtres avancés
 * + favoris ressources (GUIC-24).
 */
export function RessourcesClient({ initialItems, total }: RessourcesClientProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeRessourceValue | 'all'>('all')
  const [advanced, setAdvanced] = useState<RessourcesFiltresValue>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [favoriIds, setFavoriIds] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(PAGE_SIZE)

  // Charge les IDs favoris (silencieux si user non connecté).
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

  const categoriesOptions = useMemo(
    () =>
      Array.from(
        new Set(
          initialItems
            .map((r) => r.categorie)
            .filter((c): c is string => Boolean(c && c.trim())),
        ),
      ).sort(),
    [initialItems],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialItems.filter((r) => {
      if (type !== 'all' && r.type !== type) return false
      if (advanced.type && r.type !== advanced.type) return false
      if (!matchAdvanced(r, advanced)) return false
      if (!q) return true
      return (
        r.titre.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.theme.toLowerCase().includes(q)
      )
    })
  }, [initialItems, query, type, advanced])

  const shown = filtered.slice(0, visible)
  const hasMore = filtered.length > visible
  const activeAdvanced = countActiveFilters(advanced)
  const hasActiveFilters = activeAdvanced > 0 || type !== 'all' || query.trim().length > 0

  const handleToggleFavori = async (id: string) => {
    // Optimiste : on bascule localement, on rétablit si l'API échoue.
    setFavoriIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    try {
      const res = await fetch(`/api/ressources/${id}/favori`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 401) {
        // Non connecté → rollback et rediriger vers l'auth.
        setFavoriIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        router.push('/auth/sign-in')
        return
      }
      if (!res.ok) throw new Error('toggle failed')
    } catch {
      // Rollback en cas d'erreur réseau.
      setFavoriIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }
  }

  const resetAll = () => {
    setQuery('')
    setType('all')
    setAdvanced({})
    setVisible(PAGE_SIZE)
  }

  return (
    <div className="flex flex-col gap-space-4">
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
            <Chip key={f.value} selected={type === f.value} onClick={() => setType(f.value)}>
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
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
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

      {shown.length === 0 ? (
        <EmptyState
          emoji="📚"
          title="Aucune ressource trouvée"
          description={
            total === 0
              ? 'Aucune ressource publiée pour le moment. Revenez bientôt.'
              : 'Aucune ressource ne correspond à votre recherche.'
          }
          actionLabel="Voir les opportunités"
          onAction={() => router.push('/opportunites')}
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-3 list-none p-0 m-0">
            {shown.map((r) => (
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
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                aria-label="Charger plus de ressources"
              >
                Charger plus
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
        totalCount={filtered.length}
        onApply={(next) => {
          setAdvanced(next)
          setVisible(PAGE_SIZE)
        }}
      />
    </div>
  )
}
