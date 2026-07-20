import { Domaine, Region } from '@prisma/client'
import type { CreateOpportuniteInput, SousTypeSlug } from '@/lib/services/opportunite-service'

/**
 * GUIC-601 — US-6 : mappe un item de curation (base extraite) vers l'input du workflow
 * de publication existant (`OpportuniteService.create`). L'extraction ne fournit que la
 * base ; les détails sous-type OBLIGATOIRES reçoivent des valeurs minimales — l'Opportunite
 * est créée en `brouillon` et l'admin les complète dans l'éditeur existant.
 */

const SOUS_TYPES: readonly SousTypeSlug[] = [
  'emploi', 'stage', 'formation', 'bourse', 'concours',
  'appel_a_projets', 'financement', 'mentorat', 'mobilite', 'volontariat',
]

export function estSousTypeValide(slug: string): slug is SousTypeSlug {
  return (SOUS_TYPES as readonly string[]).includes(slug)
}

/** Domaine extrait → enum Guichet (défaut `Autre` si non reconnu). */
export function domaineOuAutre(v: unknown): Domaine {
  return typeof v === 'string' && (Object.values(Domaine) as string[]).includes(v)
    ? (v as Domaine)
    : Domaine.Autre
}

/** Région extraite → enum Guichet ou null si non reconnue. */
export function regionOuNull(v: unknown): Region | null {
  return typeof v === 'string' && (Object.values(Region) as string[]).includes(v)
    ? (v as Region)
    : null
}

function slugify(titre: string): string {
  return titre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240)
}

/** Slug unique : base + suffixe court (évite la collision `SLUG_EXISTANT`). */
export function slugUnique(titre: string): string {
  const base = slugify(titre) || 'opportunite'
  return `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 280)
}

export interface DonneesItem {
  titre: string
  description?: string
  organisation?: string
  region?: string
  domaine?: string
  deadline?: string
  /** URL source (http(s) déjà validée côté appelant). Undefined si non exploitable. */
  lienSource?: string
}

/** Parse défensif : une deadline non-ISO issue de l'extraction ne doit pas faire planter create. */
export function deadlineOuNull(v: string | undefined): Date | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Construit l'input de publication (statut `brouillon`) : base commune + détails sous-type
 * minimaux par défaut (complétés ensuite par l'admin dans l'éditeur d'opportunités).
 */
export function construireInputPublication(
  type: SousTypeSlug,
  d: DonneesItem,
): CreateOpportuniteInput {
  const base = {
    titre: d.titre,
    slug: slugUnique(d.titre),
    description: d.description?.trim() || d.titre,
    organisationLibelle: d.organisation?.trim() || '—',
    domaine: domaineOuAutre(d.domaine),
    region: regionOuNull(d.region),
    deadline: deadlineOuNull(d.deadline),
    // Traçabilité : uniquement une URL http(s) (défense en profondeur avec l'appelant).
    lienExterne: d.lienSource && /^https?:\/\//i.test(d.lienSource) ? d.lienSource : null,
    statut: 'brouillon' as const,
  }
  const org = base.organisationLibelle

  switch (type) {
    case 'emploi':
      return { type, base, details: { typeContrat: 'CDD' } }
    case 'stage':
      return { type, base, details: { dureeMois: 1 } }
    case 'formation':
      return { type, base, details: { dureeHeures: 1, modalite: 'PRESENTIEL' } }
    case 'bourse':
      return { type, base, details: { montantTotalFcfa: 0, organismeFinanceur: org } }
    case 'concours':
      return { type, base, details: { organismeOrganisateur: org } }
    case 'appel_a_projets':
      return { type, base, details: { dossierRequis: '—', criteresEligibilite: '—' } }
    case 'financement':
      return { type, base, details: { montantFcfa: 0, typeFinancement: 'SUBVENTION', organismeFinanceur: org } }
    case 'mentorat':
      return { type, base, details: { dureeMois: 1, modalite: 'INDIVIDUEL', organisateurLibelle: org } }
    case 'mobilite':
      return { type, base, details: { destination: d.region?.trim() || '—', typeMobilite: 'PROFESSIONNELLE', dureeMois: 1 } }
    case 'volontariat':
      return { type, base, details: { dureeMois: 1, typeVolontariat: 'ENGAGEMENT', domaineMission: d.domaine?.trim() || '—' } }
  }
}
