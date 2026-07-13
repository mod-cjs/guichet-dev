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
 * Design v4 (yaye-web.jsx §Opportunités) : la carte typée porte un **bandeau d'en-tête
 * coloré** (fond doux + carré icône plein + label à la couleur signature) et un **CTA à la
 * couleur du type**. Ces maps ton→classes rendent ce traitement cohérent (tokens uniquement).
 */
/** Fond doux du bandeau d'en-tête typé. */
export const TONE_SOFT_BG: Record<OpportuniteTone, string> = {
  teal: 'bg-gj-teal-soft',
  yellow: 'bg-gj-yellow-soft',
  blue: 'bg-gj-blue-soft',
  green: 'bg-gj-green-soft',
  red: 'bg-gj-red-soft',
  grey: 'bg-gj-bg',
}
/** Fond plein signature (carré icône, bouton CTA). Texte blanc lisible (AA) sur chacun. */
export const TONE_SOLID_BG: Record<OpportuniteTone, string> = {
  teal: 'bg-gj-teal-deep',
  yellow: 'bg-gj-yellow-ink',
  blue: 'bg-gj-blue-ink',
  green: 'bg-gj-green-ink',
  red: 'bg-gj-red-ink',
  grey: 'bg-gj-grey',
}
/** Texte à la couleur signature (label de type). */
export const TONE_TEXT: Record<OpportuniteTone, string> = {
  teal: 'text-gj-teal-deep',
  yellow: 'text-gj-yellow-ink',
  blue: 'text-gj-blue-ink',
  green: 'text-gj-green-ink',
  red: 'text-gj-red-ink',
  grey: 'text-gj-grey',
}

/** Ton (couleur signature) d'un type d'opportunité. */
export function toneOf(type: TypeOpportunite): OpportuniteTone {
  return TYPE_TONE[type] ?? 'grey'
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

// ─────────────────────────────────────────────────────────────────────────────
// Système par SLUG (table dynamique `OpportuniteType`, 10 sous-catégories réelles en base :
// emploi · stage · formation · bourse · concours · appel_a_projets · financement · mentorat ·
// mobilite · volontariat). L'enum `TypeOpportunite` n'en distingue que 6 → Financement, Concours,
// Mentorat, Mobilité n'avaient aucune identité. On aligne icône + CTA sur le design v4 (yaye-web.jsx
// `OPP_TYPES`) ; les teintes sont regroupées par FAMILLE car la palette `gj-*` (teal/yellow/blue/green)
// n'a pas les 10 couleurs de v4 (jamais de hex en dur — cf. CLAUDE.md). Le signal fort = icône + action.

/** Ton signature par slug (familles : travail=teal · parcours/mobilité=blue · financement=yellow · engagement=green). */
export const SLUG_TONE: Record<string, OpportuniteTone> = {
  emploi: 'teal',
  stage: 'teal',
  formation: 'blue',
  mobilite: 'blue',
  concours: 'blue',
  bourse: 'yellow',
  financement: 'yellow',
  appel_a_projets: 'yellow',
  volontariat: 'green',
  mentorat: 'green',
}

/** Icône signature par slug (ids présents dans `/icons.svg`, alignés v4). */
export const SLUG_ICON: Record<string, IconName> = {
  emploi: 'employment',
  stage: 'target',
  formation: 'learning',
  mobilite: 'globe',
  concours: 'bolt',
  bourse: 'funding',
  financement: 'funding',
  appel_a_projets: 'project',
  volontariat: 'heart',
  mentorat: 'users',
}

/** CTA par défaut par slug (repli si `OpportuniteType.actionLabel` non chargé). */
export const SLUG_ACTION_LABEL: Record<string, string> = {
  emploi: 'Postuler',
  stage: 'Postuler',
  formation: "S'inscrire",
  bourse: 'Demander',
  financement: 'Demander',
  appel_a_projets: 'Déposer un dossier',
  volontariat: "S'engager",
  concours: 'Participer',
  mentorat: 'Candidater',
  mobilite: 'Postuler',
}

export function slugTone(slug?: string | null): OpportuniteTone | undefined {
  return slug ? SLUG_TONE[slug] : undefined
}
export function slugIcon(slug?: string | null): IconName | undefined {
  return slug ? SLUG_ICON[slug] : undefined
}
export function actionLabelForSlug(slug?: string | null): string | undefined {
  return slug ? SLUG_ACTION_LABEL[slug] : undefined
}
