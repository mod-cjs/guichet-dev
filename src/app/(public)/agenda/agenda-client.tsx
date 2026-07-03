'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Chip, EmptyState, Icon, Button, Toast } from '@/components/ui'
import { EvenementCard } from '@/components/evenements/EvenementCard'
import { EvenementFilters, type QuandFilter } from '@/components/evenements/EvenementFilters'
import { AgendaCalendrier } from '@/components/evenements/AgendaCalendrier'
import { htmlToPlainText } from '@/lib/rich-html'
import type { EvenementListItem, TypeEvenementValue } from '@/lib/loaders/evenements'

interface Props {
  initialItems: EvenementListItem[]
  total: number
  isAuthenticated?: boolean
}

const PAGE_SIZE = 6
type Vue = 'liste' | 'calendrier'

/**
 * Client agenda (GUIC-362 refonte v2).
 * - Layout 2 colonnes desktop : sidebar filtres + liste
 * - Filtres : type (radio) + quand (chips rapides)
 * - Toggle Liste / Calendrier
 * - Inscription rapide depuis la carte (idem GUIC-23)
 */
export function AgendaClient({ initialItems, total, isAuthenticated = false }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeEvenementValue | 'all'>('all')
  const [quand, setQuand] = useState<QuandFilter>('tous')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [vue, setVue] = useState<Vue>('liste')
  const [mois, setMois] = useState<Date>(() => {
    if (initialItems.length > 0) {
      const d = new Date(initialItems[0].dateDebut)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)

  // Inscriptions courantes
  const [inscriptions, setInscriptions] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const pendingRef = useRef<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'danger' | 'info' } | null>(null)

  useEffect(() => {
    if (!isAuthenticated || initialItems.length === 0) return
    let cancelled = false
    Promise.all(
      initialItems.map((ev) =>
        fetch(`/api/evenements/${ev.id}/inscription`)
          .then((r) => (r.ok ? r.json() : null))
          .then((b) => (b?.data?.inscrit ? ev.id : null))
          .catch(() => null),
      ),
    ).then((ids) => {
      if (cancelled) return
      setInscriptions(new Set(ids.filter((id): id is string => !!id)))
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, initialItems])

  // Compteurs pour la sidebar filtres
  const counts = useMemo(() => {
    const c: Record<TypeEvenementValue | 'all', number> = {
      all: initialItems.length,
      Atelier: 0,
      Forum: 0,
      Formation: 0,
      Webinar: 0,
      Conference: 0,
    }
    for (const ev of initialItems) c[ev.type]++
    return c
  }, [initialItems])

  // Bornes "Quand"
  const quandFilter = useCallback(
    (ev: EvenementListItem): boolean => {
      if (quand === 'tous') return true
      const d = new Date(ev.dateDebut).getTime()
      const now = Date.now()
      const day = 86_400_000
      if (quand === 'semaine') return d >= now && d <= now + 7 * day
      if (quand === 'mois') {
        const ref = new Date(ev.dateDebut)
        const today = new Date()
        return ref.getFullYear() === today.getFullYear() && ref.getMonth() === today.getMonth()
      }
      // plus-tard
      return d > now + 30 * day
    },
    [quand],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialItems.filter((ev) => {
      if (type !== 'all' && ev.type !== type) return false
      if (!quandFilter(ev)) return false
      if (!q) return true
      return (
        ev.titre.toLowerCase().includes(q) ||
        htmlToPlainText(ev.description).toLowerCase().includes(q) ||
        ev.lieu.toLowerCase().includes(q)
      )
    })
  }, [initialItems, query, type, quandFilter])

  const shown = filtered.slice(0, visible)
  const hasMore = filtered.length > visible

  const handleInscrire = useCallback(
    (id: string) => {
      if (!isAuthenticated) {
        router.push('/auth/connexion?return=%2Fagenda')
        return
      }
      if (pendingRef.current) return
      const wasInscrit = inscriptions.has(id)
      pendingRef.current = id
      setPendingId(id)
      setInscriptions((prev) => {
        const next = new Set(prev)
        if (wasInscrit) next.delete(id)
        else next.add(id)
        return next
      })

      const url = `/api/evenements/${id}/inscription`
      const req = wasInscrit ? fetch(url, { method: 'DELETE' }) : fetch(url, { method: 'POST' })
      req
        .then((r) => {
          if (!r.ok && r.status !== 409) throw new Error(String(r.status))
          setToast({
            message: wasInscrit ? 'Désinscription confirmée' : 'Inscription confirmée',
            variant: 'success',
          })
        })
        .catch(() => {
          setInscriptions((prev) => {
            const next = new Set(prev)
            if (wasInscrit) next.add(id)
            else next.delete(id)
            return next
          })
          setToast({ message: 'Action impossible, réessayez', variant: 'danger' })
        })
        .finally(() => {
          pendingRef.current = null
          setPendingId(null)
        })
    },
    [isAuthenticated, inscriptions, router],
  )

  const resetFilters = () => {
    setType('all')
    setQuand('tous')
    setQuery('')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-space-5 items-start">
      {/* Sidebar filtres — desktop sticky, mobile collapsible */}
      <div className={showFiltersMobile ? 'block' : 'hidden lg:block'}>
        <EvenementFilters
          type={type}
          onTypeChange={setType}
          quand={quand}
          onQuandChange={setQuand}
          counts={counts}
          onReset={resetFilters}
        />
      </div>

      <div className="flex flex-col gap-space-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-space-2">
          <div className="flex gap-space-2" role="tablist" aria-label="Affichage des événements">
            <Chip selected={vue === 'liste'} onClick={() => setVue('liste')}>
              <Icon name="document" size={14} /> Liste
            </Chip>
            <Chip selected={vue === 'calendrier'} onClick={() => setVue('calendrier')}>
              <Icon name="calendar" size={14} /> Calendrier
            </Chip>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setShowFiltersMobile((v) => !v)}
            aria-expanded={showFiltersMobile}
            aria-controls="agenda-filters"
          >
            <Icon name="filter" size={14} />
            Filtres
          </Button>
        </div>

        {vue === 'liste' && (
          <>
            <div className="relative">
              <span className="absolute left-space-3 top-1/2 -translate-y-1/2 text-color-text-muted pointer-events-none">
                <Icon name="search" size={18} />
              </span>
              <Input
                type="search"
                placeholder="Rechercher un événement…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher un événement"
                className="pl-[44px]"
              />
            </div>
            <p className="text-fs-200 text-color-text-secondary" aria-live="polite">
              {filtered.length} événement{filtered.length > 1 ? 's' : ''} à venir
            </p>
          </>
        )}

        {vue === 'calendrier' ? (
          <AgendaCalendrier
            events={initialItems}
            mois={mois}
            onMoisChange={setMois}
            onInscrire={handleInscrire}
            isAuthenticated={isAuthenticated}
            inscriptions={inscriptions}
            pendingId={pendingId}
          />
        ) : shown.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Aucun événement trouvé"
            description={
              total === 0
                ? 'Aucun événement publié pour le moment. Revenez bientôt.'
                : 'Aucun événement ne correspond à votre recherche.'
            }
            actionLabel="Voir les opportunités"
            onAction={() => router.push('/opportunites')}
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-space-3 list-none p-0 m-0">
              {shown.map((ev) => (
                <li key={ev.id}>
                  <EvenementCard
                    item={ev}
                    onInscrire={handleInscrire}
                    isAuthenticated={isAuthenticated}
                    isInscrit={inscriptions.has(ev.id)}
                    isPending={pendingId === ev.id}
                  />
                </li>
              ))}
            </ul>

            {hasMore && (
              <div className="flex justify-center mt-space-2">
                <Button
                  variant="ghost"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  aria-label="Charger plus d'événements"
                >
                  Charger plus
                </Button>
              </div>
            )}
          </>
        )}

        {toast && (
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        )}
      </div>
    </div>
  )
}
