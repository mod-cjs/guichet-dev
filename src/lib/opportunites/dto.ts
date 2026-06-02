/**
 * GUIC-184 (M3 v2 — 178c/4) — Couche DTO opportunités.
 *
 * Conforme à `.agent_context/specs/M3-schema-polymorphique.md` §6.
 *
 * Trois mapppings exposés :
 *  - `toOpportuniteListItem`        → forme `OpportuniteListItem` (carte liste, contrat actuel)
 *  - `toOpportuniteDetailDTO`       → détail enrichi (carte + champs sous-type sous `details` discriminé)
 *  - `toOpportuniteExportDTO`       → format aplati Data Hub (DP7 — préfixes par sous-type)
 *
 * Stratégie **hybride** : tant que la migration data (178d / GUIC-185) n'est pas exécutée,
 * la table mère contient des rows _legacy_ sans `typeRef` ni sous-type. Le DTO retombe
 * alors sur les colonnes legacy (`type` enum, `organisation` String) pour garantir
 * la continuité des contrats publics et interop.
 */

import type {
  Opportunite,
  OpportuniteType,
  Programme,
  OpportuniteEmploi,
  OpportuniteStage,
  OpportuniteFormation,
  OpportuniteBourse,
  OpportuniteConcours,
  OpportuniteAppelAProjets,
  OpportuniteFinancement,
  OpportuniteMentorat,
  OpportuniteMobilite,
  OpportuniteVolontariat,
  OpportuniteSkill,
  OpportuniteTag,
  Skill,
  Tag,
  TypeOpportunite,
  Domaine,
  Region,
  StatutOpportunite,
} from '@prisma/client'
import type { OpportuniteListItem } from '@/types/opportunite'

// ─────────────────────────────────────────────
// Types — row d'entrée (Prisma + include sous-types)
// ─────────────────────────────────────────────

/**
 * Forme attendue d'une opportunité « riche » lue par le service avec include complet.
 * Tous les sous-types sont `nullable` pour gérer le cas legacy non encore migré.
 */
export interface OpportuniteRow extends Opportunite {
  typeRef?: OpportuniteType | null
  programme?: Programme | null
  emploi?: OpportuniteEmploi | null
  stage?: OpportuniteStage | null
  formation?: OpportuniteFormation | null
  bourse?: OpportuniteBourse | null
  concours?: OpportuniteConcours | null
  appelAProjets?: OpportuniteAppelAProjets | null
  financement?: OpportuniteFinancement | null
  mentorat?: OpportuniteMentorat | null
  mobilite?: OpportuniteMobilite | null
  volontariat?: OpportuniteVolontariat | null
  skills?: (OpportuniteSkill & { skill: Skill })[]
  tags?: (OpportuniteTag & { tag: Tag })[]
}

// ─────────────────────────────────────────────
// Types DTO — détail discriminé par sous-type
// ─────────────────────────────────────────────

/** Sous-type technique (slug `OpportuniteType.slug`). */
export type SousTypeSlug =
  | 'emploi'
  | 'stage'
  | 'formation'
  | 'bourse'
  | 'concours'
  | 'appel_a_projets'
  | 'financement'
  | 'mentorat'
  | 'mobilite'
  | 'volontariat'

/** Champ `details` discriminé exposé en API (sans `opportuniteId` interne). */
export type OpportuniteDetailsDTO =
  | { type: 'emploi';          payload: Omit<OpportuniteEmploi, 'opportuniteId'> }
  | { type: 'stage';           payload: Omit<OpportuniteStage, 'opportuniteId'> }
  | { type: 'formation';       payload: Omit<OpportuniteFormation, 'opportuniteId'> }
  | { type: 'bourse';          payload: Omit<OpportuniteBourse, 'opportuniteId'> }
  | { type: 'concours';        payload: Omit<OpportuniteConcours, 'opportuniteId'> }
  | { type: 'appel_a_projets'; payload: Omit<OpportuniteAppelAProjets, 'opportuniteId'> }
  | { type: 'financement';     payload: Omit<OpportuniteFinancement, 'opportuniteId'> }
  | { type: 'mentorat';        payload: Omit<OpportuniteMentorat, 'opportuniteId'> }
  | { type: 'mobilite';        payload: Omit<OpportuniteMobilite, 'opportuniteId'> }
  | { type: 'volontariat';     payload: Omit<OpportuniteVolontariat, 'opportuniteId'> }

/** Programme sectoriel exposé en lecture publique (champs minimum). */
export interface ProgrammeRefDTO {
  slug: string
  nom: string
}

/** Compétence exposée. */
export interface SkillRefDTO {
  slug: string
  libelle: string
  requise: boolean
}

/** Tag exposé. */
export interface TagRefDTO {
  slug: string
  libelle: string
}

/**
 * Détail public d'une opportunité (page slug + slide-over GUIC-21).
 * Contient les champs racine de la table mère + `details` discriminé + relations.
 * Les champs `type` (enum legacy) et `organisation` (String legacy) **restent
 * présents** pour préserver le contrat client actuel.
 */
export interface OpportuniteDetailDTO {
  id: string
  slug: string
  titre: string
  description: string
  type: TypeOpportunite           // enum legacy — préservé pour compat
  domaine: Domaine
  region: Region | null
  organisation: string            // colonne legacy — préservée
  remuneration: string | null
  deadline: string | null         // ISO 8601
  lienExterne: string | null
  vues: number
  statut: StatutOpportunite

  // Champs polymorphiques (additifs — null si row non encore migrée)
  programme: ProgrammeRefDTO | null
  typeSlug: SousTypeSlug | null   // `OpportuniteType.slug`
  actionLabel: string | null      // depuis OpportuniteType.actionLabel
  requiresFileUpload: boolean
  fileLabel: string | null
  skills: SkillRefDTO[]
  tags: TagRefDTO[]
  details: OpportuniteDetailsDTO | null
}

// ─────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

/** Renvoie le nom d'organisation : preferentiellement `organisationLibelle` (nouveau), sinon legacy. */
function organisationLabel(row: OpportuniteRow): string {
  return row.organisationLibelle ?? row.organisation
}

/** Lit le sous-type présent (un seul des dix max). Retourne `null` pour les rows legacy. */
export function pickSousType(row: OpportuniteRow): OpportuniteDetailsDTO | null {
  if (row.emploi)         return { type: 'emploi',          payload: stripOpportuniteId(row.emploi) }
  if (row.stage)          return { type: 'stage',           payload: stripOpportuniteId(row.stage) }
  if (row.formation)      return { type: 'formation',       payload: stripOpportuniteId(row.formation) }
  if (row.bourse)         return { type: 'bourse',          payload: stripOpportuniteId(row.bourse) }
  if (row.concours)       return { type: 'concours',        payload: stripOpportuniteId(row.concours) }
  if (row.appelAProjets)  return { type: 'appel_a_projets', payload: stripOpportuniteId(row.appelAProjets) }
  if (row.financement)    return { type: 'financement',     payload: stripOpportuniteId(row.financement) }
  if (row.mentorat)       return { type: 'mentorat',        payload: stripOpportuniteId(row.mentorat) }
  if (row.mobilite)       return { type: 'mobilite',        payload: stripOpportuniteId(row.mobilite) }
  if (row.volontariat)    return { type: 'volontariat',     payload: stripOpportuniteId(row.volontariat) }
  return null
}

function stripOpportuniteId<T extends { opportuniteId: string }>(sub: T): Omit<T, 'opportuniteId'> {
  // Pas de spread { opportuniteId, ...rest } pour préserver le type strict.
  const clone = { ...sub } as Partial<T>
  delete clone.opportuniteId
  return clone as Omit<T, 'opportuniteId'>
}

// ─────────────────────────────────────────────
// Mappings publics
// ─────────────────────────────────────────────

/**
 * Carte de liste (`OpportuniteListItem`) — contrat **inchangé** par rapport au pré-178c.
 * On lit en priorité les colonnes legacy car elles sont garanties non-null sur la table mère ;
 * `organisationLibelle` n'est utilisé que si présent.
 */
export function toOpportuniteListItem(row: OpportuniteRow): OpportuniteListItem {
  return {
    id: row.id,
    slug: row.slug,
    titre: row.titre,
    type: row.type,
    domaine: row.domaine,
    region: row.region ?? null,
    organisation: organisationLabel(row),
    remuneration: row.remuneration ?? null,
    deadline: toIso(row.deadline),
  }
}

export function toOpportuniteListItemArray(rows: OpportuniteRow[]): OpportuniteListItem[] {
  return rows.map(toOpportuniteListItem)
}

/**
 * Détail enrichi (page slug / slide-over). Préserve les champs racine du contrat actuel,
 * et expose en additif `details` (sous-type discriminé), `programme`, `skills`, `tags`,
 * `actionLabel`, `requiresFileUpload`. Tous additifs → ignorés par clients legacy.
 */
export function toOpportuniteDetailDTO(row: OpportuniteRow): OpportuniteDetailDTO {
  const sub = pickSousType(row)
  const typeSlug = (row.typeRef?.slug as SousTypeSlug | undefined) ?? null
  const programme = row.programme
    ? { slug: row.programme.slug, nom: row.programme.nom }
    : null
  const skills: SkillRefDTO[] = (row.skills ?? []).map((s) => ({
    slug: s.skill.slug,
    libelle: s.skill.libelle,
    requise: s.requise,
  }))
  const tags: TagRefDTO[] = (row.tags ?? []).map((t) => ({
    slug: t.tag.slug,
    libelle: t.tag.libelle,
  }))
  return {
    id: row.id,
    slug: row.slug,
    titre: row.titre,
    description: row.description,
    type: row.type,
    domaine: row.domaine,
    region: row.region ?? null,
    organisation: organisationLabel(row),
    remuneration: row.remuneration ?? null,
    deadline: toIso(row.deadline),
    lienExterne: row.lienExterne ?? null,
    vues: row.vues,
    statut: row.statut,
    programme,
    typeSlug,
    actionLabel: row.typeRef?.actionLabel ?? null,
    requiresFileUpload: row.typeRef?.requiresFileUpload ?? false,
    fileLabel: row.typeRef?.fileLabel ?? null,
    skills,
    tags,
    details: sub,
  }
}

// ─────────────────────────────────────────────
// Export Data Hub — payload aplati (spec §6.3, DP7)
// ─────────────────────────────────────────────

/** Toutes les clés aplaties (préfixées par sous-type) — null si non applicable. */
export interface OpportuniteExportDTO {
  id: string
  slug: string
  titre: string
  description: string
  type: string                       // typeRef.slug si présent, sinon type legacy en lowercase
  programme_slug: string | null
  domaine: string
  region: string | null
  organisation: string
  remuneration: string | null
  deadline: string | null
  statut: string
  niveau_etude_min: string | null
  created_at: string
  updated_at: string

  // Emploi
  emploi_type_contrat: string | null
  emploi_duree_contrat_mois: number | null
  emploi_experience_requise: string | null
  emploi_teletravail: boolean | null
  emploi_niveau_etude_min: string | null

  // Stage
  stage_duree_mois: number | null
  stage_conventionne_ecole: boolean | null
  stage_indemnise: boolean | null
  stage_indemnite_mensuelle_fcfa: number | null
  stage_niveau_etude_min: string | null
  stage_date_debut_prevue: string | null

  // Formation
  formation_duree_heures: number | null
  formation_modalite: string | null
  formation_certifiante: boolean | null
  formation_organisme_certificateur: string | null
  formation_prerequis: string | null
  formation_gratuite: boolean | null
  formation_frais_inscription_fcfa: number | null

  // Bourse
  bourse_montant_total_fcfa: number | null
  bourse_duree_mois: number | null
  bourse_niveau_etude_requis: string | null
  bourse_pays_destination: string | null
  bourse_organisme_financeur: string | null
  bourse_couple_obligatoire: boolean | null

  // Concours
  concours_organisme_organisateur: string | null
  concours_date_epreuves: string | null
  concours_lieu_epreuves: string | null
  concours_preuves_demandees: string | null
  concours_places_disponibles: number | null

  // Appel à projets
  appel_a_projets_budget_max_fcfa: number | null
  appel_a_projets_duree_projet_mois: number | null
  appel_a_projets_thematique: string | null
  appel_a_projets_dossier_requis: string | null
  appel_a_projets_criteres_eligibilite: string | null

  // Financement
  financement_montant_fcfa: number | null
  financement_type_financement: string | null
  financement_taux_annuel: number | null
  financement_garanties: string | null
  financement_duree_remboursement_mois: number | null
  financement_organisme_financeur: string | null
  financement_is_continuous: boolean | null
  financement_date_limite_depot: string | null

  // Mentorat
  mentorat_duree_mois: number | null
  mentorat_modalite: string | null
  mentorat_thematique: string | null
  mentorat_places_disponibles: number | null
  mentorat_organisateur_libelle: string | null

  // Mobilité
  mobilite_destination: string | null
  mobilite_type_mobilite: string | null
  mobilite_duree_mois: number | null
  mobilite_pris_en_charge: string | null
  mobilite_niveau_langue_requis: string | null
  mobilite_date_depart_prevue: string | null

  // Volontariat
  volontariat_duree_mois: number | null
  volontariat_type_volontariat: string | null
  volontariat_indemnite_mensuelle_fcfa: number | null
  volontariat_domaine_mission: string | null
  volontariat_places_disponibles: number | null

  skills: string[]
  tags: string[]
}

function decimalToNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v)
  // Prisma Decimal a une méthode `toNumber()` ou `toString()`
  const maybe = v as { toNumber?: () => number; toString?: () => string }
  if (typeof maybe.toNumber === 'function') return maybe.toNumber()
  if (typeof maybe.toString === 'function') return Number(maybe.toString())
  return null
}

/** Mapping Data Hub — toutes colonnes présentes, `null` quand non applicable. */
export function toOpportuniteExportDTO(row: OpportuniteRow): OpportuniteExportDTO {
  const typeSlug = row.typeRef?.slug ?? row.type.toLowerCase()
  const e = row.emploi
  const s = row.stage
  const f = row.formation
  const b = row.bourse
  const c = row.concours
  const a = row.appelAProjets
  const fi = row.financement
  const me = row.mentorat
  const mo = row.mobilite
  const vo = row.volontariat
  return {
    id: row.id,
    slug: row.slug,
    titre: row.titre,
    description: row.description,
    type: typeSlug,
    programme_slug: row.programme?.slug ?? null,
    domaine: row.domaine,
    region: row.region ?? null,
    organisation: organisationLabel(row),
    remuneration: row.remuneration ?? null,
    deadline: toIso(row.deadline),
    statut: row.statut,
    niveau_etude_min: row.niveauEtudeMin ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),

    emploi_type_contrat:      e?.typeContrat ?? null,
    emploi_duree_contrat_mois: e?.dureeContratMois ?? null,
    emploi_experience_requise: e?.experienceRequise ?? null,
    emploi_teletravail:        e ? e.teletravail : null,
    emploi_niveau_etude_min:   e?.niveauEtudeMin ?? null,

    stage_duree_mois:               s?.dureeMois ?? null,
    stage_conventionne_ecole:       s ? s.conventionneEcole : null,
    stage_indemnise:                s ? s.indemnise : null,
    stage_indemnite_mensuelle_fcfa: s?.indemniteMensuelleFcfa ?? null,
    stage_niveau_etude_min:         s?.niveauEtudeMin ?? null,
    stage_date_debut_prevue:        toIso(s?.dateDebutPrevue),

    formation_duree_heures:            f?.dureeHeures ?? null,
    formation_modalite:                f?.modalite ?? null,
    formation_certifiante:             f ? f.certifiante : null,
    formation_organisme_certificateur: f?.organismeCertificateur ?? null,
    formation_prerequis:               f?.prerequis ?? null,
    formation_gratuite:                f ? f.gratuite : null,
    formation_frais_inscription_fcfa:  f?.fraisInscriptionFcfa ?? null,

    bourse_montant_total_fcfa:  b?.montantTotalFcfa ?? null,
    bourse_duree_mois:          b?.dureeMois ?? null,
    bourse_niveau_etude_requis: b?.niveauEtudeRequis ?? null,
    bourse_pays_destination:    b?.paysDestination ?? null,
    bourse_organisme_financeur: b?.organismeFinanceur ?? null,
    bourse_couple_obligatoire:  b ? b.coupleObligatoire : null,

    concours_organisme_organisateur: c?.organismeOrganisateur ?? null,
    concours_date_epreuves:          toIso(c?.dateEpreuves),
    concours_lieu_epreuves:          c?.lieuEpreuves ?? null,
    concours_preuves_demandees:      c?.preuvesDemandees ?? null,
    concours_places_disponibles:     c?.placesDisponibles ?? null,

    appel_a_projets_budget_max_fcfa:       a?.budgetMaxFcfa ?? null,
    appel_a_projets_duree_projet_mois:     a?.dureeProjetMois ?? null,
    appel_a_projets_thematique:            a?.thematique ?? null,
    appel_a_projets_dossier_requis:        a?.dossierRequis ?? null,
    appel_a_projets_criteres_eligibilite:  a?.criteresEligibilite ?? null,

    financement_montant_fcfa:              fi?.montantFcfa ?? null,
    financement_type_financement:          fi?.typeFinancement ?? null,
    financement_taux_annuel:               decimalToNumber(fi?.tauxAnnuel),
    financement_garanties:                 fi?.garanties ?? null,
    financement_duree_remboursement_mois:  fi?.dureeRemboursementMois ?? null,
    financement_organisme_financeur:       fi?.organismeFinanceur ?? null,
    financement_is_continuous:             fi ? fi.isContinuous : null,
    financement_date_limite_depot:         toIso(fi?.dateLimiteDepot),

    mentorat_duree_mois:           me?.dureeMois ?? null,
    mentorat_modalite:             me?.modalite ?? null,
    mentorat_thematique:           me?.thematique ?? null,
    mentorat_places_disponibles:   me?.placesDisponibles ?? null,
    mentorat_organisateur_libelle: me?.organisateurLibelle ?? null,

    mobilite_destination:          mo?.destination ?? null,
    mobilite_type_mobilite:        mo?.typeMobilite ?? null,
    mobilite_duree_mois:           mo?.dureeMois ?? null,
    mobilite_pris_en_charge:       mo?.prisEnCharge ?? null,
    mobilite_niveau_langue_requis: mo?.niveauLangueRequis ?? null,
    mobilite_date_depart_prevue:   toIso(mo?.dateDepartPrevue),

    volontariat_duree_mois:               vo?.dureeMois ?? null,
    volontariat_type_volontariat:         vo?.typeVolontariat ?? null,
    volontariat_indemnite_mensuelle_fcfa: vo?.indemniteMensuelleFcfa ?? null,
    volontariat_domaine_mission:          vo?.domaineMission ?? null,
    volontariat_places_disponibles:       vo?.placesDisponibles ?? null,

    skills: (row.skills ?? []).map((s) => s.skill.slug),
    tags: (row.tags ?? []).map((t) => t.tag.slug),
  }
}

export function toOpportuniteExportDTOArray(rows: OpportuniteRow[]): OpportuniteExportDTO[] {
  return rows.map(toOpportuniteExportDTO)
}
