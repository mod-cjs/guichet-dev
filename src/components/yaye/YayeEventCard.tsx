'use client'

import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import type { YayeEvenementItem } from '@/lib/ia/blocks'

/**
 * Carte d'événement (agenda) affichée DANS la conversation Yaye.
 * - Pavé date (jour + mois) + repère de type coloré (icône + libellé) ;
 * - lieu / centre, gratuité ; toute la carte est cliquable → détail `/agenda/[id]` ;
 * - CTA « S'inscrire » (au-dessus du lien étiré) ouvre l'inscription sur le détail.
 * Aligné sur la sectorisation des types d'`EvenementCard` (tons gj-*, jamais de hex).
 */

type EvTone = 'teal' | 'blue' | 'yellow' | 'green' | 'red'

const EV_TONE: Record<string, EvTone> = {
  Atelier: 'teal',
  Forum: 'blue',
  Formation: 'yellow',
  Webinar: 'green',
  Conference: 'red',
  Cours: 'blue',
}
const EV_ICON: Record<string, IconName> = {
  Atelier: 'learning',
  Forum: 'employment',
  Formation: 'project',
  Webinar: 'video',
  Conference: 'engagement',
  Cours: 'learning',
}
const EV_LABEL: Record<string, string> = {
  Atelier: 'Atelier',
  Forum: 'Forum emploi',
  Formation: 'Formation',
  Webinar: 'Webinaire',
  Conference: 'Conférence',
  Cours: 'Cours',
}

const TONE_SOFT: Record<EvTone, string> = {
  teal: 'bg-gj-teal-soft',
  blue: 'bg-gj-blue-soft',
  yellow: 'bg-gj-yellow-soft',
  green: 'bg-gj-green-soft',
  red: 'bg-gj-red-soft',
}
const TONE_SOLID: Record<EvTone, string> = {
  teal: 'bg-gj-teal-deep',
  blue: 'bg-gj-blue-ink',
  yellow: 'bg-gj-yellow-ink',
  green: 'bg-gj-green-ink',
  red: 'bg-gj-red-ink',
}
const TONE_TEXT: Record<EvTone, string> = {
  teal: 'text-gj-teal-deep',
  blue: 'text-gj-blue-ink',
  yellow: 'text-gj-yellow-ink',
  green: 'text-gj-green-ink',
  red: 'text-gj-red-ink',
}

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit' })
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function YayeEventCard({ ev, onNavigate }: { ev: YayeEvenementItem; onNavigate?: () => void }) {
  const tone = EV_TONE[ev.type] ?? 'teal'
  const icon = EV_ICON[ev.type] ?? 'calendar'
  const label = EV_LABEL[ev.type] ?? ev.type
  const d = new Date(ev.dateDebut)
  const jour = DAY_FMT.format(d)
  const mois = MONTH_FMT.format(d).replace('.', '').toUpperCase()
  const heure = TIME_FMT.format(d)

  return (
    <article
      data-testid="yaye-event-card"
      data-type={ev.type}
      className="relative bg-gj-surface border-[1.5px] border-gj-line rounded-gj-lg overflow-hidden flex flex-col"
    >
      <Link
        href={`/agenda/${ev.id}`}
        onClick={onNavigate}
        aria-label={`Voir l'événement : ${ev.titre}`}
        className="absolute inset-0"
      />

      <div className="flex items-stretch gap-space-3 p-space-3">
        {/* Pavé date. */}
        <div className={`flex flex-col items-center justify-center rounded-gj-md ${TONE_SOFT[tone]} px-space-2 py-space-1 shrink-0 min-w-[52px]`}>
          <span className={`text-fs-400 font-black leading-none ${TONE_TEXT[tone]}`}>{jour}</span>
          <span className={`text-fs-100 font-bold ${TONE_TEXT[tone]}`}>{mois}</span>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <span className={`inline-flex items-center gap-1 text-fs-100 font-black uppercase tracking-wide ${TONE_TEXT[tone]}`}>
            <span aria-hidden className={`w-4 h-4 rounded-gj-sm ${TONE_SOLID[tone]} text-white inline-flex items-center justify-center`}>
              <Icon name={icon} size={10} />
            </span>
            {label}
          </span>
          <span className="font-bold text-fs-300 text-gj-ink leading-snug">{ev.titre}</span>
          <span className="flex items-center gap-space-3 text-fs-200 text-gj-grey flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={12} aria-hidden />
              {heure}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={12} aria-hidden />
              {ev.centre ?? ev.lieu}
            </span>
            {ev.estGratuit && <span className={`text-fs-100 font-bold ${TONE_TEXT[tone]}`}>Gratuit</span>}
          </span>
        </div>
      </div>

      <div className="px-space-3 pb-space-3">
        <Link
          href={`/agenda/${ev.id}`}
          onClick={onNavigate}
          aria-label={`S'inscrire à ${ev.titre}`}
          className={`relative z-10 self-start rounded-gj-lg ${TONE_SOLID[tone]} text-white px-space-3 py-[6px] text-fs-200 font-bold inline-flex items-center gap-1`}
        >
          S’inscrire
          <Icon name="arrow-right" size={13} aria-hidden />
        </Link>
      </div>
    </article>
  )
}
