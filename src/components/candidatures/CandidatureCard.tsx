'use client'
import Link from 'next/link'
import { Card, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { CandidaturePipelineStepper } from './CandidaturePipelineStepper'
import { OpportuniteTypeChip } from '@/components/opportunites/OpportuniteTypeChip'
import {
  mockTypeToOpportuniteType,
  catFamilyForMockType,
  CAT_TILE_CLASSES,
  CAT_BADGE_SOFT_CLASSES,
} from './candidature-type-compat'
import type { CandidatureMock } from './types'

export interface CandidatureCardProps {
  item: CandidatureMock
  /** Override de l'icône métier ; sinon déduit du `type` (cf. iconMetierFor). */
  iconMetier?: IconName
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Mapping entre `CandidatureMock.type` et nom d'icône du sprite global.
 *
 * Exporté pour les tests / Storybook. Fallback `target` (icône neutre).
 */
export function iconMetierFor(type: CandidatureMock['type']): IconName {
  switch (type) {
    case 'Stage':
    case 'Emploi':
      return 'employment'
    case 'Bourse':
      return 'funding'
    case 'Concours':
      return 'trending'
    case 'Formation':
      return 'learning'
    default:
      return 'target'
  }
}

interface PillStyle {
  className: string
  label: string
}

function topPillStyle(item: CandidatureMock): PillStyle {
  if (item.currentStep === 'Decision' && item.decision === 'Acceptee') {
    return { className: 'bg-gj-green-soft text-gj-green-ink', label: 'Acceptée' }
  }
  if (item.currentStep === 'Decision' && item.decision === 'Refusee') {
    return { className: 'bg-gj-red-soft text-gj-red-ink', label: 'Refusée' }
  }
  switch (item.currentStep) {
    case 'Brouillon':
      return { className: 'bg-gj-yellow-soft text-gj-yellow-ink', label: 'Brouillon' }
    case 'Envoyee':
      return { className: 'bg-gj-teal-soft text-gj-teal-deep', label: 'Envoyée' }
    case 'EnRevue':
      return { className: 'bg-gj-blue-soft text-gj-blue', label: 'En revue' }
    case 'Entretien':
      return { className: 'bg-gj-blue-soft text-gj-blue', label: 'Entretien' }
    case 'Decision':
    default:
      return { className: 'bg-gj-grey-soft text-color-text-secondary', label: 'En attente décision' }
  }
}

interface ContextualBlock {
  tone: string
  icon: IconName
  message: string
  cta?: { label: string; href: string }
}

/**
 * Bloc contextuel par état (GUIC-252) — null pour les états silencieux
 * comme `Envoyee` / `EnRevue` (pas d'action requise).
 */
function contextualBlockFor(item: CandidatureMock): ContextualBlock | null {
  if (item.currentStep === 'Brouillon') {
    return {
      tone: 'bg-gj-yellow-soft text-gj-yellow-ink',
      icon: 'document',
      message: 'Documents manquants — complète ton dossier',
      cta: { label: 'Reprendre →', href: `/jeune/mes-candidatures/${item.id}` },
    }
  }
  if (item.currentStep === 'Entretien') {
    return {
      tone: 'bg-gj-blue-soft text-gj-blue',
      icon: 'calendar',
      message: 'Entretien planifié — prépare-toi avec Yaye',
      cta: { label: 'Préparer →', href: `/jeune/mes-candidatures/${item.id}` },
    }
  }
  if (item.currentStep === 'Decision' && item.decision === 'Acceptee') {
    return {
      tone: 'bg-gj-green-soft text-gj-green-ink',
      icon: 'sparkle',
      message: 'Bravo ! Candidature retenue',
      cta: { label: 'Voir les prochaines étapes →', href: `/jeune/mes-candidatures/${item.id}` },
    }
  }
  if (item.currentStep === 'Decision' && item.decision === 'Refusee') {
    return {
      tone: 'bg-gj-red-soft text-gj-red-ink',
      icon: 'info',
      message: 'Candidature non retenue — continue à postuler',
      cta: { label: 'Voir des opportunités similaires →', href: '/opportunites' },
    }
  }
  return null
}

/**
 * Carte candidature mobile (GUIC-190 + GUIC-252).
 *
 * GUIC-252 ajoute :
 *  - tile carré 48 px avec icône métier (à gauche du header)
 *  - bloc contextuel coloré par état (brouillon, entretien, décision)
 *  - CTA conditionnel (Reprendre / Préparer / Voir suite / Voir similaires)
 *  - les états silencieux (Envoyée, EnRevue) gardent un simple lien « Voir le détail ».
 *
 * GUIC-689 (audit v5) ajoute :
 *  - badge type recoloré par catégorie (`OpportuniteTypeChip` / compat locale
 *    pour `Concours`, sans équivalent `TypeOpportunite`) au lieu du `Tag`
 *    teal par défaut — finding A
 *  - tuile 48 px recolorée par la catégorie du type, plus par le statut du
 *    pipeline (qui reste porté par la pill dédiée) — finding B
 *  - lien étiré : toute la carte ouvre le détail, CTA internes en z-[1]
 *    (pattern `OppCard`) — finding C
 */
export function CandidatureCard({ item, iconMetier }: CandidatureCardProps) {
  const pill = topPillStyle(item)
  const catFamily = catFamilyForMockType(item.type)
  const enumType = mockTypeToOpportuniteType(item.type)
  const icon = iconMetier ?? iconMetierFor(item.type)
  const block = contextualBlockFor(item)
  const href = `/jeune/mes-candidatures/${item.id}`

  return (
    <Card
      as="article"
      className="relative flex flex-col gap-space-2"
      aria-labelledby={`candidature-title-${item.id}`}
    >
      {/* Lien étiré — toute la carte ouvre le détail (pattern OppCard, GUIC-689). */}
      <Link
        href={href}
        aria-label={`Voir la candidature : ${item.opportuniteTitre}`}
        className="absolute inset-0 rounded-gj-lg focus:outline-none
          focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]"
      />

      <div className="flex items-start gap-space-3">
        <div
          className={[
            'w-12 h-12 rounded-gj-md flex items-center justify-center shrink-0',
            CAT_TILE_CLASSES[catFamily],
          ].join(' ')}
          data-testid="candidature-tile"
        >
          <Icon name={icon} size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-space-2 flex-wrap">
            {enumType ? (
              <OpportuniteTypeChip type={enumType} />
            ) : (
              <span
                data-testid="candidature-type-badge"
                className={[
                  'inline-flex items-center px-space-2 py-[2px] rounded-gj-pill',
                  'text-fs-100 font-black uppercase tracking-[0.4px] leading-none whitespace-nowrap',
                  CAT_BADGE_SOFT_CLASSES[catFamily],
                ].join(' ')}
              >
                {item.type}
              </span>
            )}
            <span
              data-testid="candidature-status-pill"
              className={[
                'inline-flex items-center rounded-gj-pill px-2 py-[2px]',
                'text-[10px] font-extrabold uppercase tracking-[0.04em]',
                pill.className,
              ].join(' ')}
            >
              {pill.label}
            </span>
          </div>
          <h3
            id={`candidature-title-${item.id}`}
            className="mt-space-1 text-fs-400 font-bold text-color-text-primary leading-snug"
          >
            {item.opportuniteTitre}
          </h3>
          <p className="text-fs-200 text-color-text-secondary mt-[2px]">{item.organisation}</p>
          {item.envoyeeA ? (
            <p className="text-fs-100 text-color-text-muted mt-space-1">
              {item.currentStep === 'Brouillon'
                ? `Modifié le ${dateFmt.format(new Date(item.envoyeeA))}`
                : `Envoyée le ${dateFmt.format(new Date(item.envoyeeA))}`}
            </p>
          ) : null}
        </div>
      </div>

      <CandidaturePipelineStepper currentStep={item.currentStep} decision={item.decision} />

      {block ? (
        <div
          role="status"
          data-testid="candidature-contextual-block"
          className={[
            'flex items-center gap-space-2 rounded-gj-md px-space-3 py-space-2',
            block.tone,
          ].join(' ')}
        >
          <Icon name={block.icon} size={18} />
          <span className="flex-1 text-fs-200 font-bold leading-snug">{block.message}</span>
        </div>
      ) : null}

      <div className="relative z-[1] flex justify-end pt-space-1">
        {block?.cta ? (
          <Link
            href={block.cta.href}
            className="text-fs-200 font-bold text-gj-teal-deep hover:underline"
            data-testid="candidature-contextual-cta"
          >
            {block.cta.label}
          </Link>
        ) : (
          <Link href={href} className="text-fs-200 font-bold text-gj-teal-deep hover:underline">
            Voir le détail →
          </Link>
        )}
      </div>
    </Card>
  )
}
