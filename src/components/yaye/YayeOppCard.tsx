'use client'

import Link from 'next/link'
import type { TypeOpportunite } from '@prisma/client'
import { Icon } from '@/components/ui'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { typeLabel } from '@/components/opportunites/OpportuniteTypeChip'
import {
  TYPE_ICON,
  TONE_SOFT_BG,
  TONE_SOLID_BG,
  TONE_TEXT,
  toneOf,
  actionLabelForType,
  slugTone,
  slugIcon,
  actionLabelForSlug,
} from '@/components/opportunites/opportunite-type-meta'
import { buildDeadlineInfo } from '@/components/opportunites/OppCard'
import { regionLabel } from '@/lib/regions'
import type { YayeOppItem } from '@/lib/ia/blocks'

/**
 * Carte d'opportunité affichée DANS la conversation Yaye (drawer / chat).
 *
 * Design v4 (yaye-web.jsx §Opportunités) : carte fortement typée —
 * - **bandeau d'en-tête coloré** (fond doux + carré icône plein + label MAJUSCULE à la
 *   couleur signature du type), l'échéance à droite ;
 * - le **conseil de Yaye** dans un encart teal-soft avec mini-avatar « Y » ;
 * - un **CTA à la couleur du type** (« Postuler », « S'inscrire »… selon le type).
 * Toute la carte est cliquable → détail `/opportunites/[slug]` ; le CTA (au-dessus du
 * lien étiré) ouvre la candidature (`?postuler=1`).
 */
/**
 * GUIC-688 — marqueurs de traçage du lien : `src=ia` attribue le clic au chat,
 * `from=reco` le rattache à la recommandation dont la card est issue.
 */
function suffixeTracage(opp: YayeOppItem): string {
  return opp.origine === 'reco' ? '?src=ia&from=reco' : '?src=ia'
}

export function YayeOppCard({ opp, onNavigate }: { opp: YayeOppItem; onNavigate?: () => void }) {
  const dl = buildDeadlineInfo(opp.deadline)
  const region = regionLabel(opp.region)
  const type = opp.type as TypeOpportunite
  // Identité par SLUG (10 sous-catégories : financement, concours, mentorat, mobilité…),
  // repli sur l'enum à 6 valeurs si le slug n'est pas chargé.
  const tone = slugTone(opp.typeSlug) ?? toneOf(type)
  const icon = slugIcon(opp.typeSlug) ?? TYPE_ICON[type]
  const label = opp.typeLabel ?? typeLabel(type)
  const urgent = dl?.urgent
  // CTA propre au type (design v4) : override admin (DB actionLabel) > défaut par slug > par enum.
  const ctaLabel = opp.actionLabel ?? actionLabelForSlug(opp.typeSlug) ?? actionLabelForType(type)

  return (
    <article
      data-testid="yaye-opp-card"
      data-type={type}
      className={`relative bg-gj-surface border-[1.5px] ${urgent ? 'border-gj-red' : 'border-gj-line'}
        rounded-gj-lg overflow-hidden flex flex-col`}
    >
      {/* Lien étiré — carte cliquable vers le détail. */}
      <Link
        href={`/opportunites/${opp.slug}${suffixeTracage(opp)}`}
        onClick={onNavigate}
        aria-label={`Voir l'opportunité : ${opp.titre}`}
        className="absolute inset-0"
      />

      {/* Bandeau d'en-tête coloré = repère de type fort. */}
      <div className={`flex items-center gap-space-2 px-space-3 py-space-2 ${TONE_SOFT_BG[tone]}`}>
        <span
          aria-hidden
          className={`w-6 h-6 rounded-gj-md ${TONE_SOLID_BG[tone]} text-white inline-flex items-center justify-center shrink-0`}
        >
          <Icon name={icon} size={13} />
        </span>
        <span className={`text-fs-100 font-black uppercase tracking-wide ${TONE_TEXT[tone]}`}>
          {label}
        </span>
        <span className="flex-1" />
        {dl && (
          <span className={`inline-flex items-center gap-1 text-fs-100 font-bold ${urgent ? 'text-gj-red' : TONE_TEXT[tone]}`}>
            <Icon name="clock" size={11} aria-hidden />
            {dl.label}
          </span>
        )}
      </div>

      {/* Corps. */}
      <div className="flex flex-col gap-space-2 p-space-3">
        <div className="font-bold text-fs-300 text-gj-ink leading-snug">{opp.titre}</div>

        {(opp.organisation || region) && (
          <div className="flex items-center gap-space-3 text-fs-200 text-gj-grey flex-wrap">
            {opp.organisation && (
              <span className="inline-flex items-center gap-1">
                <Icon name="users" size={12} aria-hidden />
                {opp.organisation}
              </span>
            )}
            {region && (
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={12} aria-hidden />
                {region}
              </span>
            )}
          </div>
        )}

        {/* Conseil de Yaye — encart signature (mini-avatar « Y »). */}
        {opp.note && (
          <div className="flex items-start gap-space-2 rounded-gj-md bg-gj-teal-soft p-space-2">
            <YayeAvatar size={24} />
            <span className="text-fs-100 text-gj-teal-deep font-semibold leading-snug">{opp.note}</span>
          </div>
        )}

        {/* GUIC-691 — CTA de conversion : magenta, pas la couleur du type. En v5 la
            couleur de type sert à REPÉRER l'offre, le magenta à AGIR : les confondre
            noie l'action dans le décor. z-10 pour passer au-dessus du lien étiré. */}
        <Link
          href={`/opportunites/${opp.slug}?postuler=1&${suffixeTracage(opp).slice(1)}`}
          onClick={onNavigate}
          aria-label={`${ctaLabel} : ${opp.titre}`}
          className="gj-cta gj-cta--sm relative z-10 self-start"
        >
          {ctaLabel}
          <Icon name="arrow-right" size={13} aria-hidden />
        </Link>
      </div>
    </article>
  )
}
