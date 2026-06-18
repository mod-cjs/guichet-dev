'use client'

import Link from 'next/link'
import type { TypeOpportunite } from '@prisma/client'
import { Icon } from '@/components/ui'
import { OpportuniteTypeChip } from '@/components/opportunites/OpportuniteTypeChip'
import { buildDeadlineInfo } from '@/components/opportunites/OppCard'
import { regionLabel } from '@/lib/regions'
import type { YayeOppItem } from '@/lib/ia/blocks'

/**
 * Carte d'opportunité affichée DANS la conversation Yaye (drawer / chat).
 * - Toute la carte est cliquable → détail `/opportunites/[slug]`.
 * - CTA « Candidater » → ouvre la candidature sur le détail (`?postuler=1`),
 *   au-dessus du lien étiré (interaction de soumission).
 */
export function YayeOppCard({ opp, onNavigate }: { opp: YayeOppItem; onNavigate?: () => void }) {
  const dl = buildDeadlineInfo(opp.deadline)
  const region = regionLabel(opp.region)

  return (
    <article
      data-testid="yaye-opp-card"
      className={`relative bg-gj-surface border-[1.5px] ${dl?.urgent ? 'border-gj-red' : 'border-gj-line'}
        rounded-gj-lg p-space-3 flex flex-col gap-space-2`}
    >
      {/* Lien étiré — carte cliquable vers le détail. */}
      <Link
        href={`/opportunites/${opp.slug}`}
        onClick={onNavigate}
        aria-label={`Voir l'opportunité : ${opp.titre}`}
        className="absolute inset-0 rounded-gj-lg"
      />

      <div className="flex items-center gap-space-1 flex-wrap">
        <OpportuniteTypeChip
          type={opp.type as TypeOpportunite}
          tone={dl?.urgent ? 'red' : undefined}
          suffix={dl?.urgent ? dl.label : undefined}
        />
      </div>

      <div className="font-bold text-fs-300 text-gj-ink leading-snug">{opp.titre}</div>
      {opp.organisation && <div className="text-fs-200 text-gj-grey">{opp.organisation}</div>}

      <div className="flex items-center gap-space-3 text-fs-200 text-gj-grey">
        {region && (
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size={12} aria-hidden />
            {region}
          </span>
        )}
        {dl && !dl.urgent && (
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={12} aria-hidden />
            {dl.label}
          </span>
        )}
      </div>

      {/* CTA soumission — z-10 pour passer au-dessus du lien étiré. */}
      <Link
        href={`/opportunites/${opp.slug}?postuler=1`}
        onClick={onNavigate}
        className="relative z-10 self-start rounded-gj-lg bg-gj-teal-deep text-white
          px-space-3 py-[6px] text-fs-200 font-bold inline-flex items-center gap-1"
      >
        Candidater
        <Icon name="arrow-right" size={13} aria-hidden />
      </Link>
    </article>
  )
}
