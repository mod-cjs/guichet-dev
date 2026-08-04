import Link from 'next/link'
import { Card, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { CandidaturePipelineStepper } from './CandidaturePipelineStepper'
import { OpportuniteTypeChip } from '@/components/opportunites/OpportuniteTypeChip'
import { TYPE_CAT } from '@/components/opportunites/opportunite-type-meta'
import { CAT_TILE_CLASSES } from './candidature-type-compat'
import type { CandidatureDetailDTO } from '@/lib/candidature-detail-loader'
import type { CandidatureDecision, PipelineStep } from './types'

export interface CandidatureDetailProps {
  candidature: CandidatureDetailDTO
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Mappe le statut Prisma actuel (4 valeurs) sur le pipeline 5 étapes UI.
 * Tant que le schéma n'a pas été migré (cf. types.ts TODO), on infère :
 *  - En_attente → step "Envoyee"
 *  - Vue        → step "EnRevue"
 *  - Retenue    → step "Decision" + decision "Acceptee"
 *  - Refusee    → step "Decision" + decision "Refusee"
 */
function pipelineFromStatut(
  statut: CandidatureDetailDTO['statut'],
): { step: PipelineStep; decision: CandidatureDecision } {
  switch (statut) {
    case 'En_attente':
      return { step: 'Envoyee', decision: null }
    case 'Vue':
      return { step: 'EnRevue', decision: null }
    case 'Retenue':
      return { step: 'Decision', decision: 'Acceptee' }
    case 'Refusee':
    default:
      return { step: 'Decision', decision: 'Refusee' }
  }
}

/** Icône métier selon `TypeOpportunite`. */
function iconForType(type: CandidatureDetailDTO['opportunite']['type']): IconName {
  switch (type) {
    case 'Emploi':
    case 'Stage':
      return 'employment'
    case 'Bourse':
      return 'funding'
    case 'Formation':
      return 'learning'
    case 'Volontariat':
      return 'engagement'
    case 'Appel_a_projets':
      return 'trending'
    default:
      return 'target'
  }
}

const STATUT_PILL: Record<
  CandidatureDetailDTO['statut'],
  { label: string; className: string }
> = {
  En_attente: { label: 'Envoyée', className: 'bg-gj-teal-soft text-gj-teal-deep' },
  Vue: { label: 'En revue', className: 'bg-gj-blue-soft text-gj-blue' },
  Retenue: { label: 'Retenue', className: 'bg-gj-green-soft text-gj-green-ink' },
  Refusee: { label: 'Non retenue', className: 'bg-gj-red-soft text-gj-red-ink' },
}

/**
 * Page détail d'une candidature (GUIC-253).
 *
 * Sections :
 *  - Breadcrumb (retour)
 *  - Hero (tile icône type + titre + organisation + statut + date)
 *  - Stepper 5 étapes (réutilise CandidaturePipelineStepper)
 *  - Section « Ma candidature » (lettre motivation collapsible + lien CV)
 *  - Section « Échanges » (stub)
 *  - CTA « Voir l'opportunité » (GUIC-689 : pas de CTA de retrait — feature
 *    inexistante, voir commentaire au niveau du bloc CTAs)
 */
export function CandidatureDetail({ candidature }: CandidatureDetailProps) {
  const pipeline = pipelineFromStatut(candidature.statut)
  const pill = STATUT_PILL[candidature.statut]
  const icon = iconForType(candidature.opportunite.type)
  // GUIC-689 (finding A/B) — `candidature.opportunite.type` porte déjà le vrai
  // `TypeOpportunite` Prisma (chargé par candidature-detail-loader.ts), pas
  // besoin de compat : TYPE_CAT/OpportuniteTypeChip s'appliquent directement.
  const catFamily = TYPE_CAT[candidature.opportunite.type] ?? 'cat-neutre'
  const lettre = candidature.lettreMotivation ?? ''
  const lettreLong = lettre.length > 500
  const lettrePreview = lettreLong ? `${lettre.slice(0, 500)}…` : lettre

  return (
    <article className="flex flex-col gap-space-4">
      {/* Breadcrumb + retour */}
      <nav aria-label="Fil d'Ariane" className="text-fs-200 text-color-text-muted">
        <Link
          href="/jeune/mes-candidatures"
          className="inline-flex items-center gap-space-1 hover:text-color-text-primary"
        >
          <Icon name="chevron-left" size={16} />
          <span>Mes candidatures</span>
        </Link>
        <span aria-hidden> / </span>
        <span className="text-color-text-secondary">{candidature.opportunite.titre}</span>
      </nav>

      {/* Hero */}
      <Card as="header" className="flex flex-col gap-space-3">
        <div className="flex items-start gap-space-3">
          <div
            data-testid="detail-hero-tile"
            className={`w-14 h-14 rounded-gj-md flex items-center justify-center shrink-0 ${CAT_TILE_CLASSES[catFamily]}`}
          >
            <Icon name={icon} size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-space-2 flex-wrap">
              <OpportuniteTypeChip type={candidature.opportunite.type} />
              <span
                data-testid="detail-status-pill"
                className={[
                  'inline-flex items-center rounded-gj-pill px-2 py-[2px]',
                  'text-fs-100 font-extrabold uppercase tracking-[0.04em]',
                  pill.className,
                ].join(' ')}
              >
                {pill.label}
              </span>
            </div>
            <h1
              className="mt-space-1 text-fs-600 font-black text-color-text-primary leading-snug"
              data-testid="detail-title"
            >
              {candidature.opportunite.titre}
            </h1>
            <p className="text-fs-300 text-color-text-secondary mt-[2px]">
              {candidature.opportunite.organisation}
            </p>
            <p className="text-fs-100 text-color-text-muted mt-space-1">
              Soumise le {dateFmt.format(new Date(candidature.soumiseA))}
            </p>
          </div>
        </div>

        <CandidaturePipelineStepper
          currentStep={pipeline.step}
          decision={pipeline.decision}
        />
      </Card>

      {/* Section « Ma candidature » */}
      <Card>
        <h2 className="text-fs-500 font-bold text-color-text-primary">Ma candidature</h2>
        <div className="mt-space-3 flex flex-col gap-space-3">
          {lettre ? (
            <details data-testid="detail-lettre">
              <summary className="cursor-pointer text-fs-200 font-bold text-gj-teal-deep">
                Lettre de motivation
              </summary>
              <p
                className="mt-space-2 whitespace-pre-line break-words text-fs-300 text-color-text-primary"
                style={{ overflowWrap: 'anywhere' }}
              >
                {lettrePreview}
              </p>
              {lettreLong ? (
                <p className="text-fs-100 text-color-text-muted mt-space-1">
                  Aperçu tronqué — la version complète est conservée côté recruteur.
                </p>
              ) : null}
            </details>
          ) : (
            <p className="text-fs-200 text-color-text-muted">
              Aucune lettre de motivation jointe.
            </p>
          )}

          {candidature.cvUrl ? (
            <a
              href={`/api/candidatures/${candidature.id}/cv`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-space-2 text-fs-200 font-bold text-gj-teal-deep hover:underline"
              data-testid="detail-cv-link"
            >
              <Icon name="document" size={16} />
              <span>Voir le CV (PDF)</span>
              <Icon name="external" size={14} />
            </a>
          ) : (
            <p className="text-fs-100 text-color-text-muted" data-testid="detail-cv-empty">
              Aucun CV joint.
            </p>
          )}
        </div>
      </Card>

      {/* Section « Échanges » (stub) */}
      <Card>
        <h2 className="text-fs-500 font-bold text-color-text-primary">Échanges</h2>
        <p className="mt-space-2 text-fs-200 text-color-text-muted">
          Aucun message pour le moment — les retours du recruteur s&apos;afficheront ici.
        </p>
      </Card>

      {/* CTAs */}
      <div className="flex flex-col gap-space-2 sm:flex-row sm:justify-end">
        <Link
          href={`/opportunites/${candidature.opportunite.slug}`}
          className="inline-flex items-center justify-center gap-space-2 rounded-gj-md border border-gj-line bg-white px-space-4 py-space-2 min-h-[var(--tap-min)] text-fs-200 font-bold text-color-text-primary hover:bg-gj-bg"
          data-testid="detail-cta-opportunite"
        >
          Voir l&apos;opportunité
          <Icon name="arrow-right" size={16} />
        </Link>
        {/* GUIC-689 (finding A3) — pas de bouton "Retirer ma candidature" : ni route
            API ni statut Prisma `Retiree` n'existent. L'ajouter engagerait des
            décisions produit (notification recruteur, réversibilité, CDP) hors
            périmètre de ce ticket ; feature à traiter dans une story dédiée. */}
      </div>
    </article>
  )
}
