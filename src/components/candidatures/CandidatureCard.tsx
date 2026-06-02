'use client'
import Link from 'next/link'
import { Card, Tag } from '@/components/ui'
import { CandidaturePipelineStepper } from './CandidaturePipelineStepper'
import type { CandidatureMock } from './types'

export interface CandidatureCardProps {
  item: CandidatureMock
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

function topPillStyle(item: CandidatureMock): { className: string; label: string } {
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

/**
 * Carte candidature mobile (GUIC-190).
 *
 * Header : titre opportunité + badge type · pill statut.
 * Body   : organisation · date envoi · stepper 5 étapes.
 * Footer : CTA "Voir détail" → /jeune/mes-candidatures/[id] (route, page OOS).
 */
export function CandidatureCard({ item }: CandidatureCardProps) {
  const pill = topPillStyle(item)

  return (
    <Card
      as="article"
      className="flex flex-col gap-space-2"
      aria-labelledby={`candidature-title-${item.id}`}
    >
      <div className="flex items-start justify-between gap-space-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-space-2 flex-wrap">
            <Tag>{item.type}</Tag>
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

      <div className="flex justify-end pt-space-1">
        <Link
          href={`/jeune/mes-candidatures/${item.id}`}
          className="text-fs-200 font-bold text-gj-teal-deep hover:underline"
        >
          Voir le détail →
        </Link>
      </div>
    </Card>
  )
}
