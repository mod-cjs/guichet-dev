'use client'

import { Card, Badge, Button, Icon } from '@/components/ui'
import type { EvenementListItem, TypeEvenementValue } from '@/lib/loaders/evenements'

interface EventCardProps {
  item: EvenementListItem
  /**
   * Callback CTA. Selon l'état (user connecté ou non, déjà inscrit ou non),
   * le parent décide quoi faire (POST/DELETE inscription, ou redirect /auth).
   */
  onInscrire?: (id: string) => void
  /** True si l'utilisateur est authentifié. Si false → bouton "Se connecter pour s'inscrire". */
  isAuthenticated?: boolean
  /** True si l'utilisateur est déjà inscrit à cet événement (auth requis). */
  isInscrit?: boolean
  /** État de chargement (pendant l'appel API d'inscription/désinscription). */
  isPending?: boolean
}

const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Couleur de l'accent date selon le type d'événement. */
const TYPE_ACCENT: Record<TypeEvenementValue, { bg: string; text: string; badge: 'teal' | 'yellow' | 'red' | 'blue' | 'green' }> = {
  Formation:  { bg: 'bg-gj-teal-soft',   text: 'text-gj-teal-deep',   badge: 'teal' },
  Atelier:    { bg: 'bg-gj-yellow-soft', text: 'text-gj-yellow-ink',  badge: 'yellow' },
  Forum:      { bg: 'bg-gj-blue-soft',   text: 'text-gj-blue-ink',    badge: 'blue' },
  Webinar:    { bg: 'bg-gj-green-soft',  text: 'text-gj-green-ink',   badge: 'green' },
  Conference: { bg: 'bg-gj-red-soft',    text: 'text-gj-red-ink',     badge: 'red' },
}

/** Carte événement (M5 — refonte v2 / GUIC-23 inscription). */
export function EventCard({
  item,
  onInscrire,
  isAuthenticated = false,
  isInscrit = false,
  isPending = false,
}: EventCardProps) {
  const date = new Date(item.dateDebut)
  const jour = date.getDate()
  const mois = MONTH_SHORT.format(date).replace('.', '').toUpperCase()
  const heure = TIME_FMT.format(date)
  const accent = TYPE_ACCENT[item.type]
  const inscriptionsOuvertes = item.statut === 'a_venir'

  // Libellé + intent du bouton selon l'état utilisateur.
  let ctaLabel: string
  let ctaAria: string
  let ctaVariant: 'primary' | 'ghost' | 'secondary' = 'primary'
  if (!isAuthenticated) {
    ctaLabel = "Se connecter pour s'inscrire"
    ctaAria = `Se connecter pour s'inscrire à ${item.titre}`
  } else if (isInscrit) {
    ctaLabel = 'Se désinscrire'
    ctaAria = `Se désinscrire de ${item.titre}`
    ctaVariant = 'ghost'
  } else {
    ctaLabel = "S'inscrire"
    ctaAria = `S'inscrire à ${item.titre}`
  }

  return (
    <Card variant="opportunite" className="flex gap-space-3">
      <div
        className={`flex-shrink-0 flex flex-col items-center justify-center rounded-gj-md ${accent.bg} ${accent.text} w-[64px] py-space-2`}
        aria-hidden
      >
        <span className="text-fs-600 font-black leading-none">{jour}</span>
        <span className="text-fs-100 font-bold uppercase tracking-wider mt-1">{mois}</span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-space-1">
        <div className="flex items-start justify-between gap-space-2">
          <h3 className="text-fs-400 font-black text-color-text-primary line-clamp-2">
            {item.titre}
          </h3>
          <Badge variant={accent.badge}>{item.type}</Badge>
        </div>

        {item.organisation && (
          <p className="text-fs-200 text-color-text-secondary">{item.organisation}</p>
        )}

        <div className="flex flex-wrap items-center gap-space-2 text-fs-200 text-color-text-secondary mt-space-1">
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size={14} />
            <span className="truncate max-w-[160px]">{item.lieu}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={14} />
            <span>{heure}</span>
          </span>
          {item.estGratuit && (
            <span className="text-gj-teal-deep font-bold">Gratuit</span>
          )}
          {isAuthenticated && isInscrit && (
            <span className="inline-flex items-center gap-1 text-gj-teal-deep font-bold">
              <Icon name="check" size={14} />
              Inscrit
            </span>
          )}
        </div>

        {inscriptionsOuvertes && (
          <div className="mt-space-2">
            <Button
              size="sm"
              variant={ctaVariant}
              disabled={isPending}
              onClick={() => onInscrire?.(item.id)}
              aria-label={ctaAria}
            >
              {ctaLabel}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
