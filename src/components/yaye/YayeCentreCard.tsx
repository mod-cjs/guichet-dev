'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui'
import { regionLabel } from '@/lib/regions'
import type { YayeCentreItem } from '@/lib/ia/blocks'

/** Fiche centre CJS dans la conversation → détail /centres/[slug]. */

const SERVICE_LABEL: Record<string, string> = {
  WiFi: 'WiFi',
  Bibliotheque: 'Bibliothèque',
  Coworking: 'Coworking',
  Ateliers: 'Ateliers',
  Conseiller: 'Conseiller',
  Salle_reunion: 'Salle de réunion',
  Postes_info: 'Postes info',
  Imprimante: 'Imprimante',
  Cafe: 'Café',
  Espace_detente: 'Espace détente',
}

export function YayeCentreCard({ centre, onNavigate }: { centre: YayeCentreItem; onNavigate?: () => void }) {
  const href = centre.slug ? `/centres/${centre.slug}` : '/centres'
  const lieu = [centre.ville, regionLabel(centre.region)].filter(Boolean).join(' · ')
  const services = centre.services.slice(0, 4)
  return (
    <article
      data-testid="yaye-centre-card"
      className="relative bg-gj-surface border-[1.5px] border-gj-line rounded-gj-lg p-space-3 flex flex-col gap-space-2"
    >
      <Link href={href} onClick={onNavigate} aria-label={`Voir le centre : ${centre.nom}`} className="absolute inset-0" />

      <div className="flex items-center gap-space-2">
        <span aria-hidden className="w-8 h-8 rounded-gj-md bg-gj-teal-deep text-white inline-flex items-center justify-center shrink-0">
          <Icon name="pin" size={15} />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-fs-300 text-gj-ink leading-snug">{centre.nom}</span>
          {lieu && <span className="text-fs-200 text-gj-grey">{lieu}</span>}
        </div>
      </div>

      <span className="text-fs-200 text-gj-grey inline-flex items-center gap-1">
        <Icon name="pin" size={12} aria-hidden />
        {centre.adresse}
      </span>

      {services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {services.map(s => (
            <span key={s} className="text-fs-100 font-semibold text-gj-teal-deep bg-gj-teal-soft rounded-gj-pill px-space-2 py-[2px]">
              {SERVICE_LABEL[s] ?? s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-space-3">
        {centre.telephone && (
          <a href={`tel:${centre.telephone}`} onClick={e => e.stopPropagation()} className="relative z-10 inline-flex items-center gap-1 text-fs-200 font-bold text-gj-teal-deep">
            <Icon name="phone" size={13} aria-hidden />
            Appeler
          </a>
        )}
        <span className="relative z-10 inline-flex items-center gap-1 text-fs-200 font-bold text-gj-teal-deep ml-auto">
          Voir le centre
          <Icon name="arrow-right" size={13} aria-hidden />
        </span>
      </div>
    </article>
  )
}
