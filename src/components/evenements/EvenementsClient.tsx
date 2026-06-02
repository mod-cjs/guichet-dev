'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Chip, EmptyState, Icon, Button } from '@/components/ui'
import { EventCard } from './EventCard'
import type { EvenementListItem, TypeEvenementValue } from '@/lib/loaders/evenements'

interface EvenementsClientProps {
  initialItems: EvenementListItem[]
  total: number
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

/**
 * UI client — recherche + filtres + pagination "Charger plus" sur la liste
 * d'événements rendue côté serveur. Le tri/filtres profonds restent côté
 * client tant que la liste tient sous 20 items (page initiale).
 */
export function EvenementsClient({ initialItems, total }: EvenementsClientProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeEvenementValue | 'all'>('all')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialItems.filter((ev) => {
      if (type !== 'all' && ev.type !== type) return false
      if (!q) return true
      return (
        ev.titre.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q) ||
        ev.lieu.toLowerCase().includes(q)
      )
    })
  }, [initialItems, query, type])

  const shown = filtered.slice(0, visible)
  const hasMore = filtered.length > visible

  const handleInscrire = (_id: string) => {
    // Inscription gérée par M5 (auth requise) — redirige vers /auth/login
    router.push('/auth/login')
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
      </div>

      {shown.length === 0 ? (
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
                <EventCard item={ev} onInscrire={handleInscrire} />
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
    </div>
  )
}
