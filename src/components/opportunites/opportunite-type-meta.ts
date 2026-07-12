import type { TypeOpportunite } from '@prisma/client'
import type { IconName } from '@/components/ui'

/**
 * Métadonnées visuelles partagées d'un type d'opportunité (sectorisation design v2).
 * Source unique pour le chip ET les cards (OppCard public, YayeOppCard) afin que la
 * différenciation par type (couleur + icône + liseré) reste cohérente partout.
 *
 * Sectorisation (alignée sur l'enum Prisma `TypeOpportunite`) :
 *  - Emploi / Stage      → teal (cjs)        · icône employment
 *  - Formation           → blue (learning)   · icône learning
 *  - Bourse              → yellow (partner)   · icône funding
 *  - Volontariat         → green (engagement) · icône engagement
 *  - Appel à projets     → yellow (partner)   · icône project
 */

export type OpportuniteTone = 'teal' | 'yellow' | 'blue' | 'green' | 'red' | 'grey'

export const TYPE_TONE: Record<TypeOpportunite, OpportuniteTone> = {
  Emploi: 'teal',
  Stage: 'teal',
  Formation: 'blue',
  Bourse: 'yellow',
  Volontariat: 'green',
  Appel_a_projets: 'yellow',
}

/** Icône sectorielle par type (ids présents dans `public/icons.svg`). */
export const TYPE_ICON: Record<TypeOpportunite, IconName> = {
  Emploi: 'employment',
  Stage: 'employment',
  Formation: 'learning',
  Bourse: 'funding',
  Volontariat: 'engagement',
  Appel_a_projets: 'project',
}

/**
 * Classe de liseré latéral coloré par ton (accent gauche des cards). Les tokens
 * réutilisent les couleurs `-deep`/`-ink` déjà servies par le chip (donc valides
 * côté Tailwind) — jamais de hex en dur (cf. CLAUDE.md).
 */
export const TONE_ACCENT_BORDER: Record<OpportuniteTone, string> = {
  teal: 'border-l-gj-teal-deep',
  yellow: 'border-l-gj-yellow-ink',
  blue: 'border-l-gj-blue-ink',
  green: 'border-l-gj-green-ink',
  red: 'border-l-gj-red-ink',
  grey: 'border-l-gj-grey',
}

/** Classes d'accent gauche d'une card pour un type donné (largeur + couleur du ton). */
export function typeAccentBorder(type: TypeOpportunite): string {
  return `border-l-[5px] ${TONE_ACCENT_BORDER[TYPE_TONE[type] ?? 'grey']}`
}

/**
 * Libellé d'action (CTA) propre à chaque type — la « carte fortement typée » du design v4
 * (yaye-web.jsx §Opportunités) : chaque opportunité porte SON action, pas un « Candidater »
 * générique. On postule à un emploi, on s'inscrit à une formation, on dépose un projet…
 * `OpportuniteType.actionLabel` (configurable admin) prime quand il est chargé ; sinon on
 * retombe sur ce défaut déterministe par type.
 */
export const TYPE_ACTION_LABEL: Record<TypeOpportunite, string> = {
  Emploi: 'Postuler',
  Stage: 'Postuler',
  Formation: "S'inscrire",
  Bourse: 'Soumettre un dossier',
  Volontariat: 'Rejoindre',
  Appel_a_projets: 'Déposer un projet',
}

/** CTA à afficher pour un type (défaut déterministe, cf. `TYPE_ACTION_LABEL`). */
export function actionLabelForType(type: TypeOpportunite): string {
  return TYPE_ACTION_LABEL[type] ?? 'Candidater'
}
