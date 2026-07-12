'use client'

import Link from 'next/link'
import type { TypeOpportunite } from '@prisma/client'
import { Icon } from '@/components/ui'
import { OpportuniteTypeChip } from '@/components/opportunites/OpportuniteTypeChip'
import { TYPE_ICON, typeAccentBorder, actionLabelForType } from '@/components/opportunites/opportunite-type-meta'
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
  const type = opp.type as TypeOpportunite
  // CTA propre au type (design v4) : override admin si fourni, sinon défaut par type.
  const ctaLabel = opp.actionLabel ?? actionLabelForType(type)

  return (
    <article
      data-testid="yaye-opp-card"
      data-type={type}
      className={`relative bg-gj-surface border-[1.5px] ${dl?.urgent ? 'border-gj-red' : 'border-gj-line'}
        ${typeAccentBorder(type)} rounded-gj-lg p-space-3 flex flex-col gap-space-2`}
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
          type={type}
          leadingIcon={TYPE_ICON[type]}
          tone={dl?.urgent ? 'red' : undefined}
          suffix={dl?.urgent ? dl.label : undefined}
        />
      </div>

      <div className="font-bold text-fs-300 text-gj-ink leading-snug">{opp.titre}</div>
      {opp.organisation && <div className="text-fs-200 text-gj-grey">{opp.organisation}</div>}

      {opp.note && (
        <div className="inline-flex items-start gap-1 text-fs-100 text-gj-teal-deep font-bold">
          <Icon name="sparkle" size={12} aria-hidden className="mt-[2px] shrink-0" />
          <span>{opp.note}</span>
        </div>
      )}

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
        aria-label={`${ctaLabel} : ${opp.titre}`}
        className="relative z-10 self-start rounded-gj-lg bg-gj-teal-deep text-white
          px-space-3 py-[6px] text-fs-200 font-bold inline-flex items-center gap-1"
      >
        {ctaLabel}
        <Icon name="arrow-right" size={13} aria-hidden />
      </Link>
    </article>
  )
}
