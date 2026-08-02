'use client'

import { Badge, Icon } from '@/components/ui'
import type { EvenementDetail, TypeEvenementValue } from '@/lib/loaders/evenements'

/** Gradient signature par type (cf design-v2 events-data.jsx — EV_TONES). */
const TYPE_GRADIENT: Record<TypeEvenementValue, string> = {
  Atelier:    'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
  Forum:      'linear-gradient(135deg, var(--gj-blue), var(--gj-blue-ink))',
  Formation:  'linear-gradient(135deg, var(--gj-yellow), var(--gj-yellow-ink))',
  Webinar:    'linear-gradient(135deg, var(--gj-green), var(--gj-green-ink))',
  Conference: 'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))',
}

const TYPE_BADGE: Record<TypeEvenementValue, 'teal' | 'blue' | 'yellow' | 'green' | 'red'> = {
  Atelier: 'teal',
  Forum: 'blue',
  Formation: 'yellow',
  Webinar: 'green',
  Conference: 'teal',
}

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' })
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

interface Props {
  evenement: EvenementDetail
}

/**
 * Hero de la page détail événement. Reproduit la cover "EvCover big" du
 * design v2 : pavé date à gauche, badge type, gradient signature, blob d'icône.
 */
export function EvenementDetailHero({ evenement }: Props) {
  const date = new Date(evenement.dateDebut)
  const jour = DAY_FMT.format(date)
  const mois = MONTH_FMT.format(date).replace('.', '').toUpperCase()
  const heure = TIME_FMT.format(date)

  return (
    <section
      className="relative rounded-gj-lg overflow-hidden p-space-5 text-white flex flex-col gap-space-3"
      style={{ background: TYPE_GRADIENT[evenement.type], minHeight: 200 }}
      aria-label={`Bannière ${evenement.titre}`}
    >
      <div className="flex items-start justify-between gap-space-3 relative">
        <div
          className="rounded-gj-md bg-white/95 text-center leading-none px-space-3 py-space-2"
          style={{ color: 'var(--gj-ink)' }}
          aria-hidden
        >
          <div className="text-fs-700 font-black">{jour}</div>
          <div className="text-fs-100 font-bold uppercase tracking-wider mt-1">{mois}</div>
        </div>
        <div className="flex flex-col items-end gap-space-1">
          <Badge variant={TYPE_BADGE[evenement.type]}>{evenement.type}</Badge>
          {evenement.estGratuit && (
            <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 rounded-full px-space-2 py-1 text-fs-100 font-bold uppercase tracking-wide">
              Gratuit
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-auto">
        <h1 className="text-fs-700 font-black leading-tight">{evenement.titre}</h1>
        {evenement.organisation && (
          <p className="text-fs-300 font-bold mt-space-1 inline-flex items-center gap-1">
            <Icon name="users" size={14} />
            {evenement.organisation}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-space-3 mt-space-2 text-fs-200 font-bold">
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={14} />
            {heure}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size={14} />
            {evenement.lieu}
          </span>
        </div>
      </div>
    </section>
  )
}
