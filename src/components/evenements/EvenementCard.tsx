'use client'

import Link from 'next/link'
import { Badge, Button, Icon } from '@/components/ui'
import type { EvenementListItem, TypeEvenementValue } from '@/lib/loaders/evenements'

interface EvenementCardProps {
  item: EvenementListItem
  onInscrire?: (id: string) => void
  isAuthenticated?: boolean
  isInscrit?: boolean
  isPending?: boolean
}

const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const WEEKDAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Gradient signature par type (cf design-v2/events-data.jsx · EV_TONES). */
const TYPE_GRADIENT: Record<TypeEvenementValue, string> = {
  Atelier:    'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
  Forum:      'linear-gradient(135deg, var(--gj-blue), var(--gj-blue-ink))',
  Formation:  'linear-gradient(135deg, var(--gj-yellow), var(--gj-yellow-ink))',
  Webinar:    'linear-gradient(135deg, var(--gj-green), var(--gj-green-ink))',
  Conference: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))',
}

/** GUIC-689 — le rouge code l'urgence d'échéance, jamais un type
 *  (réf v5 `events-data.jsx` : conférence = teal). */
const TYPE_BADGE: Record<TypeEvenementValue, 'teal' | 'blue' | 'yellow' | 'green'> = {
  Atelier: 'teal',
  Forum: 'blue',
  Formation: 'yellow',
  Webinar: 'green',
  Conference: 'teal',
}

const TYPE_ICON: Record<TypeEvenementValue, 'learning' | 'employment' | 'project' | 'video' | 'engagement'> = {
  Atelier:    'learning',
  Forum:      'employment',
  Formation:  'project',
  Webinar:    'video',
  Conference: 'engagement',
}

const TYPE_LABEL: Record<TypeEvenementValue, string> = {
  Atelier: 'Atelier',
  Forum: 'Forum emploi',
  Formation: 'Formation',
  Webinar: 'Webinaire',
  Conference: 'Conférence',
}

/**
 * Carte événement v2 — cover avec gradient + pavé date + bandeau bas
 * (organisation, lieu, heure, CTA). Cliquable vers `/agenda/[id]`.
 */
export function EvenementCard({
  item,
  onInscrire,
  isAuthenticated = false,
  isInscrit = false,
  isPending = false,
}: EvenementCardProps) {
  const date = new Date(item.dateDebut)
  const jour = date.getDate()
  const mois = MONTH_SHORT.format(date).replace('.', '').toUpperCase()
  const weekday = WEEKDAY_FMT.format(date)
  const heure = TIME_FMT.format(date)
  const ouvert = item.statut === 'a_venir'

  let ctaLabel: string
  let ctaAria: string
  let ctaVariant: 'primary' | 'ghost' = 'primary'
  if (!isAuthenticated) {
    // GUIC-689 — bouton de RANGÉE : secondaire (une seule action pleine par
    // écran ; la conversion vit sur la fiche détail).
    ctaLabel = 'Se connecter'
    ctaAria = `Se connecter pour s'inscrire à ${item.titre}`
    ctaVariant = 'ghost'
  } else if (isInscrit) {
    ctaLabel = 'Inscrit·e'
    ctaAria = `Désinscription de ${item.titre}`
    ctaVariant = 'ghost'
  } else {
    ctaLabel = "S'inscrire"
    ctaAria = `S'inscrire à ${item.titre}`
  }

  return (
    <article className="bg-white border border-gj-line rounded-gj-lg overflow-hidden flex flex-col">
      <Link
        href={`/agenda/${item.id}`}
        className="relative flex-shrink-0 flex flex-col justify-between text-white p-space-3 min-h-[116px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gj-teal"
        style={{ background: TYPE_GRADIENT[item.type] }}
        aria-label={`Voir le détail de ${item.titre}`}
      >
        <Icon
          name={TYPE_ICON[item.type]}
          size={104}
          aria-hidden
          className="absolute -right-3 -bottom-4 opacity-15 pointer-events-none"
        />
        <div className="flex items-start justify-between gap-space-2 relative">
          <div
            className="rounded-gj-md bg-white/95 text-center leading-none px-space-2 py-1"
            style={{ color: 'var(--gj-ink)', minWidth: 46 }}
            aria-hidden
          >
            <div className="text-fs-500 font-black">{jour}</div>
            <div className="text-fs-100 font-bold uppercase tracking-wider mt-0.5">{mois}</div>
          </div>
          {item.estGratuit && (
            <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 rounded-full px-space-2 py-0.5 text-fs-100 font-bold uppercase tracking-wide">
              Gratuit
            </span>
          )}
        </div>
        <div className="relative">
          <span className="inline-flex items-center bg-white/18 border border-white/25 rounded-full px-space-2 py-0.5 text-fs-100 font-bold uppercase tracking-wide">
            {TYPE_LABEL[item.type]}
          </span>
        </div>
      </Link>

      <div className="p-space-3 flex flex-col gap-space-2 flex-1">
        <Link
          href={`/agenda/${item.id}`}
          className="text-fs-400 font-black text-color-text-primary leading-tight line-clamp-2 hover:text-gj-teal-deep"
        >
          {item.titre}
        </Link>
        {item.organisation && (
          <p className="text-fs-200 text-color-text-secondary inline-flex items-center gap-1">
            <Icon name="users" size={12} />
            {item.organisation}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-space-3 gap-y-space-1 text-fs-200 text-color-text-secondary">
          <span className="inline-flex items-center gap-1 capitalize">
            <Icon name="calendar" size={12} />
            {weekday} {jour} {mois.toLowerCase()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={12} />
            {heure}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size={12} />
            <span className="truncate max-w-[160px]">{item.lieu}</span>
          </span>
        </div>

        <div className="mt-auto pt-space-2 flex items-center gap-space-2 border-t border-gj-line">
          <Badge variant={TYPE_BADGE[item.type]} className="hidden sm:inline-flex">
            {TYPE_LABEL[item.type]}
          </Badge>
          <span className="flex-1" />
          {ouvert && (
            <Button
              size="sm"
              variant={ctaVariant}
              disabled={isPending}
              onClick={() => onInscrire?.(item.id)}
              aria-label={ctaAria}
            >
              {isInscrit && <Icon name="check" size={14} />}
              {ctaLabel}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
