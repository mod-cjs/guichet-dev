'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Chip, EmptyState, Icon, Button, Toast } from '@/components/ui'
import { EventCard } from './EventCard'
import { AgendaCalendrier } from './AgendaCalendrier'
import { htmlToPlainText } from '@/lib/rich-html'
import type { EvenementListItem, TypeEvenementValue } from '@/lib/loaders/evenements'

interface EvenementsClientProps {
  initialItems: EvenementListItem[]
  total: number
  /** True si le visiteur a une session SSO active (côté serveur). */
  isAuthenticated?: boolean
}

const FILTRES: { value: TypeEvenementValue | 'all'; label: string }[] = [
  { value: 'all',        label: 'Toutes' },
  { value: 'Webinar',    label: 'Webinaires' },
  { value: 'Atelier',    label: 'Ateliers' },
  { value: 'Forum',      label: 'Forums' },
  { value: 'Conference', label: 'Conférences' },
  { value: 'Formation',  label: 'Formations' },
]

const PAGE_SIZE = 6
type Vue = 'liste' | 'calendrier'

/**
 * UI client — recherche + filtres + pagination "Charger plus" sur la liste
 * d'événements rendue côté serveur. GUIC-23 ajoute :
 *   - toggle Liste / Calendrier (vue calendrier mensuel)
 *   - inscription / désinscription aux événements (auth requise)
 */
export function EvenementsClient({
  initialItems,
  total,
  isAuthenticated = false,
}: EvenementsClientProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeEvenementValue | 'all'>('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [vue, setVue] = useState<Vue>('liste')
  const [mois, setMois] = useState<Date>(() => {
    // Mois du premier événement à venir, sinon le mois courant.
    if (initialItems.length > 0) {
      const d = new Date(initialItems[0].dateDebut)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // État inscriptions : set d'eventIds. Chargé une fois si authentifié.
  const [inscriptions, setInscriptions] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)
  // Ref miroir : permet de bloquer les double-clics ultra-rapides AVANT le re-render
  // (setState est asynchrone, le state `pendingId` peut encore être null au 2e clic).
  const pendingRef = useRef<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'danger' | 'info' } | null>(
    null,
  )

  // Charge initialement l'état d'inscription pour tous les events visibles.
  // Stratégie simple : un GET par event (suffisant tant que liste publique <= 20).
  // Pour scaler, ajouter plus tard un endpoint /api/evenements/inscriptions/ids.
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
      const set = new Set(ids.filter((id): id is string => !!id))
      setInscriptions(set)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, initialItems])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialItems.filter((ev) => {
      if (type !== 'all' && ev.type !== type) return false
      if (!q) return true
      return (
        ev.titre.toLowerCase().includes(q) ||
        htmlToPlainText(ev.description).toLowerCase().includes(q) ||
        ev.lieu.toLowerCase().includes(q)
      )
    })
  }, [initialItems, query, type])

  const shown = filtered.slice(0, visible)
  const hasMore = filtered.length > visible

  const handleInscrire = useCallback(
    (id: string) => {
      if (!isAuthenticated) {
        // Page humaine `/auth/connexion` (le bouton SSO appelle ensuite `/api/auth/login`).
        // `/auth/login` n'existe pas côté pages — c'est `/auth/connexion`.
        router.push('/auth/connexion')
        return
      }
      // Garde anti double-clic : vérifie le ref (synchrone) AVANT le state.
      if (pendingRef.current) return
      const wasInscrit = inscriptions.has(id)
      pendingRef.current = id
      setPendingId(id)
      // Mise à jour optimiste
      setInscriptions((prev) => {
        const next = new Set(prev)
        if (wasInscrit) next.delete(id)
        else next.add(id)
        return next
      })

      const url = `/api/evenements/${id}/inscription`
      const req = wasInscrit
        ? fetch(url, { method: 'DELETE' })
        : fetch(url, { method: 'POST' })

      req
        .then((r) => {
          // 409 sur POST = déjà inscrit → état optimiste déjà correct, traiter comme succès.
          // 409 sur DELETE n'existe pas (toujours 204), mais on reste tolérant.
          if (!r.ok && r.status !== 409) throw new Error(String(r.status))
          setToast({
            message: wasInscrit ? 'Désinscription confirmée' : 'Inscription confirmée',
            variant: 'success',
          })
        })
        .catch(() => {
          // Rollback optimiste.
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

  return (
    <div className="flex flex-col gap-space-4">
      <div className="flex flex-col gap-space-3">
        <div
          className="flex gap-space-2"
          role="tablist"
          aria-label="Affichage des événements"
        >
          <Chip selected={vue === 'liste'} onClick={() => setVue('liste')}>
            Liste
          </Chip>
          <Chip selected={vue === 'calendrier'} onClick={() => setVue('calendrier')}>
            Calendrier
          </Chip>
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

            <div className="flex flex-wrap gap-space-2" role="group" aria-label="Filtres par type">
              {FILTRES.map((f) => (
                <Chip key={f.value} selected={type === f.value} onClick={() => setType(f.value)}>
                  {f.label}
                </Chip>
              ))}
            </div>
          </>
        )}
      </div>

      {vue === 'calendrier' ? (
        <AgendaCalendrier
          events={initialItems}
          mois={mois}
          onMoisChange={setMois}
          onInscrire={handleInscrire}
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
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-space-3 list-none p-0 m-0">
            {shown.map((ev) => (
              <li key={ev.id}>
                <EventCard
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
  )
}
