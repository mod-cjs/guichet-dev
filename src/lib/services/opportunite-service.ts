/**
 * GUIC-183 (M3 v2 — 178b/4) — Service applicatif encapsulant le polymorphisme CTI.
 *
 * Conformément à `.agent_context/specs/M3-schema-polymorphique.md` §8.
 *
 * Garantit l'invariant XOR (table mère + exactement 1 sous-type non-null par opportunité)
 * en encapsulant la transaction Prisma : la création / mise à jour passe toujours par ce
 * service, jamais par `prisma.opportuniteEmploi.create` directement (cf. spec §8.4).
 *
 * Aucun accès SQL brut. Aucun loader / endpoint API n'est touché ici (sera 178c).
 *
 * GUIC-259 (Yaye Lot 1) : chaque écriture déclenche la synchronisation du
 * Knowledge Graph Neo4j (fire-and-forget, fail-soft, no-op si Neo4j absent).
 * Import PARESSEUX → n'alourdit pas le chargement du service (pas de neo4j-driver
 * au module-load) ; ne perturbe jamais l'écriture.
 */
import type {
  Prisma,
  PrismaClient,
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
  Domaine,
  Region,
  StatutOpportunite,
  TypeContrat,
  ModaliteFormation,
  NiveauEtudes,
  TypeFinancement,
  ModaliteMentorat,
  TypeMobilite,
  TypeVolontariat,
} from '@prisma/client'
import { replaceProgrammes } from '@/lib/programmes/rattachement'

// ─────────────────────────────────────────────
// Types entrée (création)
// ─────────────────────────────────────────────

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

export interface BaseInput {
  titre: string
  slug: string
  description: string
  /** Sections riches structurées (GUIC-257/503) — HTML sanitisé, distinctes du KG. */
  mission?: string | null
  profilRecherche?: string | null
  conditions?: string | null
  /**
   * Slugs des programmes sectoriels de rattachement (GUIC-684 — M:N).
   * Le premier devient `principal` sauf désignation explicite via `programmePrincipalSlug`.
   * Au moins un est exigé à la création.
   */
  programmeSlugs?: string[]
  /** Programme à marquer principal parmi `programmeSlugs` (défaut : le premier). */
  programmePrincipalSlug?: string | null
  organisationId?: string | null
  organisationLibelle: string
  domaine: Domaine
  region?: Region | null
  remuneration?: string | null
  deadline?: Date | null
  lienExterne?: string | null
  statut?: StatutOpportunite
  recruteurUid?: string | null
  niveauEtudeMin?: NiveauEtudes | null
  skills?: Array<{ skillId: string; requise?: boolean }>
  tags?: Array<{ tagId: string }>
}

export interface EmploiDetailsInput {
  typeContrat: TypeContrat
  dureeContratMois?: number | null
  experienceRequise?: string | null
  teletravail?: boolean
  niveauEtudeMin?: NiveauEtudes | null
}
export interface StageDetailsInput {
  dureeMois: number
  conventionneEcole?: boolean
  indemnise?: boolean
  indemniteMensuelleFcfa?: number | null
  niveauEtudeMin?: NiveauEtudes | null
  dateDebutPrevue?: Date | null
}
export interface FormationDetailsInput {
  dureeHeures: number
  modalite: ModaliteFormation
  certifiante?: boolean
  organismeCertificateur?: string | null
  prerequis?: string | null
  gratuite?: boolean
  fraisInscriptionFcfa?: number | null
}
export interface BourseDetailsInput {
  montantTotalFcfa: number
  dureeMois?: number | null
  niveauEtudeRequis?: NiveauEtudes | null
  paysDestination?: string | null
  organismeFinanceur: string
  coupleObligatoire?: boolean
}
export interface ConcoursDetailsInput {
  organismeOrganisateur: string
  dateEpreuves?: Date | null
  lieuEpreuves?: string | null
  preuvesDemandees?: string | null
  placesDisponibles?: number | null
}
export interface AppelAProjetsDetailsInput {
  budgetMaxFcfa?: number | null
  dureeProjetMois?: number | null
  thematique?: string | null
  dossierRequis: string
  criteresEligibilite: string
}
export interface FinancementDetailsInput {
  montantFcfa: number
  typeFinancement: TypeFinancement
  tauxAnnuel?: number | string | null
  garanties?: string | null
  dureeRemboursementMois?: number | null
  organismeFinanceur: string
  isContinuous?: boolean
  dateLimiteDepot?: Date | null
}
export interface MentoratDetailsInput {
  dureeMois: number
  modalite: ModaliteMentorat
  thematique?: string | null
  placesDisponibles?: number | null
  organisateurLibelle: string
}
export interface MobiliteDetailsInput {
  destination: string
  typeMobilite: TypeMobilite
  dureeMois: number
  prisEnCharge?: string | null
  niveauLangueRequis?: string | null
  dateDepartPrevue?: Date | null
}
export interface VolontariatDetailsInput {
  dureeMois: number
  typeVolontariat: TypeVolontariat
  indemniteMensuelleFcfa?: number | null
  domaineMission: string
  placesDisponibles?: number | null
}

/** Union discriminée par `type` — empêche structurellement les combinaisons incohérentes. */
export type CreateOpportuniteInput =
  | { type: 'emploi';          base: BaseInput; details: EmploiDetailsInput }
  | { type: 'stage';           base: BaseInput; details: StageDetailsInput }
  | { type: 'formation';       base: BaseInput; details: FormationDetailsInput }
  | { type: 'bourse';          base: BaseInput; details: BourseDetailsInput }
  | { type: 'concours';        base: BaseInput; details: ConcoursDetailsInput }
  | { type: 'appel_a_projets'; base: BaseInput; details: AppelAProjetsDetailsInput }
  | { type: 'financement';     base: BaseInput; details: FinancementDetailsInput }
  | { type: 'mentorat';        base: BaseInput; details: MentoratDetailsInput }
  | { type: 'mobilite';        base: BaseInput; details: MobiliteDetailsInput }
  | { type: 'volontariat';     base: BaseInput; details: VolontariatDetailsInput }

// ─────────────────────────────────────────────
// Types retour (discriminated unions)
// ─────────────────────────────────────────────

interface OpportuniteCore extends Opportunite {
  typeRef: OpportuniteType | null
  skills: (OpportuniteSkill & { skill: Skill })[]
  tags: (OpportuniteTag & { tag: Tag })[]
  programmes: { principal: boolean; programme: Programme }[]
}

export type OpportuniteAvecDetails =
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'emploi' }
      emploi: OpportuniteEmploi
      stage: null; formation: null; bourse: null; concours: null; appelAProjets: null
      financement: null; mentorat: null; mobilite: null; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'stage' }
      emploi: null; stage: OpportuniteStage; formation: null; bourse: null; concours: null; appelAProjets: null
      financement: null; mentorat: null; mobilite: null; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'formation' }
      emploi: null; stage: null; formation: OpportuniteFormation; bourse: null; concours: null; appelAProjets: null
      financement: null; mentorat: null; mobilite: null; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'bourse' }
      emploi: null; stage: null; formation: null; bourse: OpportuniteBourse; concours: null; appelAProjets: null
      financement: null; mentorat: null; mobilite: null; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'concours' }
      emploi: null; stage: null; formation: null; bourse: null; concours: OpportuniteConcours; appelAProjets: null
      financement: null; mentorat: null; mobilite: null; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'appel_a_projets' }
      emploi: null; stage: null; formation: null; bourse: null; concours: null; appelAProjets: OpportuniteAppelAProjets
      financement: null; mentorat: null; mobilite: null; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'financement' }
      emploi: null; stage: null; formation: null; bourse: null; concours: null; appelAProjets: null
      financement: OpportuniteFinancement; mentorat: null; mobilite: null; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'mentorat' }
      emploi: null; stage: null; formation: null; bourse: null; concours: null; appelAProjets: null
      financement: null; mentorat: OpportuniteMentorat; mobilite: null; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'mobilite' }
      emploi: null; stage: null; formation: null; bourse: null; concours: null; appelAProjets: null
      financement: null; mentorat: null; mobilite: OpportuniteMobilite; volontariat: null
    })
  | (OpportuniteCore & {
      typeRef: OpportuniteType & { slug: 'volontariat' }
      emploi: null; stage: null; formation: null; bourse: null; concours: null; appelAProjets: null
      financement: null; mentorat: null; mobilite: null; volontariat: OpportuniteVolontariat
    })

const DETAIL_INCLUDE = {
  typeRef: true,
  emploi: true,
  stage: true,
  formation: true,
  bourse: true,
  concours: true,
  appelAProjets: true,
  financement: true,
  mentorat: true,
  mobilite: true,
  volontariat: true,
  skills: { include: { skill: true } },
  tags: { include: { tag: true } },
  programmes: { include: { programme: true } },
} satisfies Prisma.OpportuniteInclude

export interface ListFilter {
  typeSlug?: SousTypeSlug
  programmeSlug?: string
  domaine?: Domaine
  region?: Region
  statut?: StatutOpportunite
  skip?: number
  take?: number
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

/** Client minimum requis (extrait des méthodes utilisées — facilite le mock test). */
type Tx = Pick<
  PrismaClient,
  | 'opportunite'
  | 'opportuniteType'
  | 'programme'
  | 'opportuniteEmploi'
  | 'opportuniteStage'
  | 'opportuniteFormation'
  | 'opportuniteBourse'
  | 'opportuniteConcours'
  | 'opportuniteAppelAProjets'
  | 'opportuniteFinancement'
  | 'opportuniteMentorat'
  | 'opportuniteMobilite'
  | 'opportuniteVolontariat'
  | 'opportuniteSkill'
  | 'opportuniteTag'
  | 'opportuniteProgramme'
>

/** Sync KG en arrière-plan (import paresseux + fail-soft) — ne bloque jamais l'écriture. */
function fireGraphSync(action: 'syncOpportuniteToGraph' | 'syncOpportuniteDeletion', id: string): void {
  void import('@/lib/ia/graph/projection/project')
    .then(m => m[action](id))
    .catch(() => { /* fail-soft : l'écriture Prisma reste la source de vérité */ })
}

export class OpportuniteService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Crée la table mère + le sous-type correspondant en transaction atomique.
   * Garantit l'invariant XOR.
   */
  async create(input: CreateOpportuniteInput): Promise<OpportuniteAvecDetails> {
    const result = await this.db.$transaction(async (tx) => {
      const type = await tx.opportuniteType.findUnique({ where: { slug: input.type } })
      if (!type) {
        throw new Error(`OpportuniteType introuvable pour slug=${input.type}`)
      }
      const created = await tx.opportunite.create({
        data: {
          slug: input.base.slug,
          titre: input.base.titre,
          description: input.base.description,
          mission: input.base.mission ?? null,
          profilRecherche: input.base.profilRecherche ?? null,
          conditions: input.base.conditions ?? null,
          // Legacy column conservée jusqu'en 178d — on dérive la valeur depuis le slug
          type: legacyTypeFromSlug(input.type),
          organisation: input.base.organisationLibelle,
          typeId: type.id,
          organisationId: input.base.organisationId ?? null,
          organisationLibelle: input.base.organisationLibelle,
          niveauEtudeMin: input.base.niveauEtudeMin ?? null,
          domaine: input.base.domaine,
          region: input.base.region ?? null,
          remuneration: input.base.remuneration ?? null,
          deadline: input.base.deadline ?? null,
          lienExterne: input.base.lienExterne ?? null,
          statut: input.base.statut ?? 'brouillon',
          recruteurUid: input.base.recruteurUid ?? null,
        },
      })

      await this.createSubtype(tx as unknown as Tx, created.id, input)
      await this.replaceSkills(tx as unknown as Tx, created.id, input.base.skills ?? [])
      await this.replaceTags(tx as unknown as Tx, created.id, input.base.tags ?? [])
      await this.replaceProgrammes(tx as unknown as Tx, created.id, input.base)

      const reloaded = await tx.opportunite.findUnique({
        where: { id: created.id },
        include: DETAIL_INCLUDE,
      })
      return assertAvecDetails(reloaded)
    })
    fireGraphSync('syncOpportuniteToGraph', result.id) // projection KG (fire-and-forget)
    return result
  }

  /** Lecture mère + sous-type discriminé. Retourne `null` si introuvable ou soft-deleted. */
  async findByIdWithDetails(id: string): Promise<OpportuniteAvecDetails | null> {
    const row = await this.db.opportunite.findUnique({ where: { id }, include: DETAIL_INCLUDE })
    if (!row || row.deletedAt) return null
    return assertAvecDetails(row)
  }

  /** Liste filtrée avec sous-types chargés (usage admin/recruteur — pas pour catalogue public). */
  async findManyWithDetails(filter: ListFilter = {}): Promise<OpportuniteAvecDetails[]> {
    const where: Prisma.OpportuniteWhereInput = {
      deletedAt: null,
      ...(filter.statut ? { statut: filter.statut } : {}),
      ...(filter.domaine ? { domaine: filter.domaine } : {}),
      ...(filter.region ? { region: filter.region } : {}),
      ...(filter.typeSlug ? { typeRef: { slug: filter.typeSlug } } : {}),
      // GUIC-684 — le rattachement vit dans la jonction : `some` couvre 1..N programmes.
      ...(filter.programmeSlug
        ? { programmes: { some: { programme: { slug: filter.programmeSlug } } } }
        : {}),
    }
    const rows = await this.db.opportunite.findMany({
      where,
      include: DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: filter.skip,
      take: filter.take,
    })
    return rows.map(assertAvecDetails)
  }

  /**
   * Mise à jour atomique mère + sous-type. Le sous-type est partiel : seuls les champs
   * fournis sont écrits. On rejette un changement de type d'opportunité (DELETE + recreate
   * explicite côté admin si nécessaire — protège l'historique candidatures).
   */
  async update(
    id: string,
    patch: {
      base?: Partial<BaseInput>
      details?: Partial<EmploiDetailsInput> &
        Partial<StageDetailsInput> &
        Partial<FormationDetailsInput> &
        Partial<BourseDetailsInput> &
        Partial<ConcoursDetailsInput> &
        Partial<AppelAProjetsDetailsInput> &
        Partial<FinancementDetailsInput> &
        Partial<MentoratDetailsInput> &
        Partial<MobiliteDetailsInput> &
        Partial<VolontariatDetailsInput>
    },
  ): Promise<OpportuniteAvecDetails> {
    const result = await this.db.$transaction(async (tx) => {
      const existing = await tx.opportunite.findUnique({
        where: { id },
        include: { typeRef: true },
      })
      if (!existing) throw new Error(`Opportunite introuvable: ${id}`)
      const slug = existing.typeRef?.slug as SousTypeSlug | undefined

      if (patch.base) {
        await tx.opportunite.update({
          where: { id },
          data: {
            ...(patch.base.titre !== undefined ? { titre: patch.base.titre } : {}),
            ...(patch.base.slug !== undefined ? { slug: patch.base.slug } : {}),
            ...(patch.base.description !== undefined ? { description: patch.base.description } : {}),
            ...(patch.base.mission !== undefined ? { mission: patch.base.mission } : {}),
            ...(patch.base.profilRecherche !== undefined ? { profilRecherche: patch.base.profilRecherche } : {}),
            ...(patch.base.conditions !== undefined ? { conditions: patch.base.conditions } : {}),
            ...(patch.base.organisationLibelle !== undefined
              ? { organisationLibelle: patch.base.organisationLibelle, organisation: patch.base.organisationLibelle }
              : {}),
            ...(patch.base.organisationId !== undefined ? { organisationId: patch.base.organisationId } : {}),
            ...(patch.base.domaine !== undefined ? { domaine: patch.base.domaine } : {}),
            ...(patch.base.region !== undefined ? { region: patch.base.region } : {}),
            ...(patch.base.remuneration !== undefined ? { remuneration: patch.base.remuneration } : {}),
            ...(patch.base.deadline !== undefined ? { deadline: patch.base.deadline } : {}),
            ...(patch.base.lienExterne !== undefined ? { lienExterne: patch.base.lienExterne } : {}),
            ...(patch.base.statut !== undefined ? { statut: patch.base.statut } : {}),
            ...(patch.base.niveauEtudeMin !== undefined ? { niveauEtudeMin: patch.base.niveauEtudeMin } : {}),
          },
        })
        if (patch.base.skills !== undefined) {
          await this.replaceSkills(tx as unknown as Tx, id, patch.base.skills)
        }
        if (patch.base.tags !== undefined) {
          await this.replaceTags(tx as unknown as Tx, id, patch.base.tags)
        }
        if (patch.base.programmeSlugs !== undefined) {
          await this.replaceProgrammes(tx as unknown as Tx, id, patch.base)
        }
      }

      if (patch.details && slug) {
        await this.updateSubtype(tx as unknown as Tx, id, slug, patch.details)
      }

      const reloaded = await tx.opportunite.findUnique({
        where: { id },
        include: DETAIL_INCLUDE,
      })
      return assertAvecDetails(reloaded)
    })
    fireGraphSync('syncOpportuniteToGraph', result.id) // projection KG (fire-and-forget)
    return result
  }

  /** Suppression définitive (cascade depuis la mère vers sous-type + jonctions). */
  async delete(id: string): Promise<void> {
    await this.db.opportunite.delete({ where: { id } })
    fireGraphSync('syncOpportuniteDeletion', id) // retrait du KG (fire-and-forget)
  }

  // ───────── helpers privés ─────────

  /**
   * Rattachement aux programmes (GUIC-684) — délègue au helper générique partagé
   * avec les ressources et les événements. La colonne `programme_id` n'est plus
   * écrite : elle reste en base le temps de la transition (drop ultérieur).
   */
  private async replaceProgrammes(tx: Tx, opportuniteId: string, base: Partial<BaseInput>): Promise<void> {
    await replaceProgrammes(
      tx,
      {
        purge: () => tx.opportuniteProgramme.deleteMany({ where: { opportuniteId } }),
        creer: (rows) =>
          tx.opportuniteProgramme.createMany({ data: rows.map((r) => ({ opportuniteId, ...r })) }),
      },
      base.programmeSlugs ?? [],
      { principalSlug: base.programmePrincipalSlug ?? null },
    )
  }

  private async createSubtype(tx: Tx, opportuniteId: string, input: CreateOpportuniteInput): Promise<void> {
    switch (input.type) {
      case 'emploi':
        await tx.opportuniteEmploi.create({
          data: {
            opportuniteId,
            typeContrat: input.details.typeContrat,
            dureeContratMois: input.details.dureeContratMois ?? null,
            experienceRequise: input.details.experienceRequise ?? null,
            teletravail: input.details.teletravail ?? false,
            niveauEtudeMin: input.details.niveauEtudeMin ?? null,
          },
        })
        return
      case 'stage':
        await tx.opportuniteStage.create({
          data: {
            opportuniteId,
            dureeMois: input.details.dureeMois,
            conventionneEcole: input.details.conventionneEcole ?? false,
            indemnise: input.details.indemnise ?? false,
            indemniteMensuelleFcfa: input.details.indemniteMensuelleFcfa ?? null,
            niveauEtudeMin: input.details.niveauEtudeMin ?? null,
            dateDebutPrevue: input.details.dateDebutPrevue ?? null,
          },
        })
        return
      case 'formation':
        await tx.opportuniteFormation.create({
          data: {
            opportuniteId,
            dureeHeures: input.details.dureeHeures,
            modalite: input.details.modalite,
            certifiante: input.details.certifiante ?? false,
            organismeCertificateur: input.details.organismeCertificateur ?? null,
            prerequis: input.details.prerequis ?? null,
            gratuite: input.details.gratuite ?? true,
            fraisInscriptionFcfa: input.details.fraisInscriptionFcfa ?? null,
          },
        })
        return
      case 'bourse':
        await tx.opportuniteBourse.create({
          data: {
            opportuniteId,
            montantTotalFcfa: input.details.montantTotalFcfa,
            dureeMois: input.details.dureeMois ?? null,
            niveauEtudeRequis: input.details.niveauEtudeRequis ?? null,
            paysDestination: input.details.paysDestination ?? null,
            organismeFinanceur: input.details.organismeFinanceur,
            coupleObligatoire: input.details.coupleObligatoire ?? false,
          },
        })
        return
      case 'concours':
        await tx.opportuniteConcours.create({
          data: {
            opportuniteId,
            organismeOrganisateur: input.details.organismeOrganisateur,
            dateEpreuves: input.details.dateEpreuves ?? null,
            lieuEpreuves: input.details.lieuEpreuves ?? null,
            preuvesDemandees: input.details.preuvesDemandees ?? null,
            placesDisponibles: input.details.placesDisponibles ?? null,
          },
        })
        return
      case 'appel_a_projets':
        await tx.opportuniteAppelAProjets.create({
          data: {
            opportuniteId,
            budgetMaxFcfa: input.details.budgetMaxFcfa ?? null,
            dureeProjetMois: input.details.dureeProjetMois ?? null,
            thematique: input.details.thematique ?? null,
            dossierRequis: input.details.dossierRequis,
            criteresEligibilite: input.details.criteresEligibilite,
          },
        })
        return
      case 'financement':
        await tx.opportuniteFinancement.create({
          data: {
            opportuniteId,
            montantFcfa: input.details.montantFcfa,
            typeFinancement: input.details.typeFinancement,
            tauxAnnuel: input.details.tauxAnnuel ?? null,
            garanties: input.details.garanties ?? null,
            dureeRemboursementMois: input.details.dureeRemboursementMois ?? null,
            organismeFinanceur: input.details.organismeFinanceur,
            isContinuous: input.details.isContinuous ?? false,
            dateLimiteDepot: input.details.dateLimiteDepot ?? null,
          },
        })
        return
      case 'mentorat':
        await tx.opportuniteMentorat.create({
          data: {
            opportuniteId,
            dureeMois: input.details.dureeMois,
            modalite: input.details.modalite,
            thematique: input.details.thematique ?? null,
            placesDisponibles: input.details.placesDisponibles ?? null,
            organisateurLibelle: input.details.organisateurLibelle,
          },
        })
        return
      case 'mobilite':
        await tx.opportuniteMobilite.create({
          data: {
            opportuniteId,
            destination: input.details.destination,
            typeMobilite: input.details.typeMobilite,
            dureeMois: input.details.dureeMois,
            prisEnCharge: input.details.prisEnCharge ?? null,
            niveauLangueRequis: input.details.niveauLangueRequis ?? null,
            dateDepartPrevue: input.details.dateDepartPrevue ?? null,
          },
        })
        return
      case 'volontariat':
        await tx.opportuniteVolontariat.create({
          data: {
            opportuniteId,
            dureeMois: input.details.dureeMois,
            typeVolontariat: input.details.typeVolontariat,
            indemniteMensuelleFcfa: input.details.indemniteMensuelleFcfa ?? null,
            domaineMission: input.details.domaineMission,
            placesDisponibles: input.details.placesDisponibles ?? null,
          },
        })
        return
    }
  }

  private async updateSubtype(
    tx: Tx,
    opportuniteId: string,
    slug: SousTypeSlug,
    patch: Record<string, unknown>,
  ): Promise<void> {
    switch (slug) {
      case 'emploi':
        await tx.opportuniteEmploi.update({ where: { opportuniteId }, data: patch })
        return
      case 'stage':
        await tx.opportuniteStage.update({ where: { opportuniteId }, data: patch })
        return
      case 'formation':
        await tx.opportuniteFormation.update({ where: { opportuniteId }, data: patch })
        return
      case 'bourse':
        await tx.opportuniteBourse.update({ where: { opportuniteId }, data: patch })
        return
      case 'concours':
        await tx.opportuniteConcours.update({ where: { opportuniteId }, data: patch })
        return
      case 'appel_a_projets':
        await tx.opportuniteAppelAProjets.update({ where: { opportuniteId }, data: patch })
        return
      case 'financement':
        await tx.opportuniteFinancement.update({ where: { opportuniteId }, data: patch })
        return
      case 'mentorat':
        await tx.opportuniteMentorat.update({ where: { opportuniteId }, data: patch })
        return
      case 'mobilite':
        await tx.opportuniteMobilite.update({ where: { opportuniteId }, data: patch })
        return
      case 'volontariat':
        await tx.opportuniteVolontariat.update({ where: { opportuniteId }, data: patch })
        return
    }
  }

  private async replaceSkills(tx: Tx, opportuniteId: string, skills: NonNullable<BaseInput['skills']>): Promise<void> {
    await tx.opportuniteSkill.deleteMany({ where: { opportuniteId } })
    if (skills.length === 0) return
    await tx.opportuniteSkill.createMany({
      data: skills.map((s) => ({
        opportuniteId,
        skillId: s.skillId,
        requise: s.requise ?? true,
      })),
    })
  }

  private async replaceTags(tx: Tx, opportuniteId: string, tags: NonNullable<BaseInput['tags']>): Promise<void> {
    await tx.opportuniteTag.deleteMany({ where: { opportuniteId } })
    if (tags.length === 0) return
    await tx.opportuniteTag.createMany({
      data: tags.map((t) => ({ opportuniteId, tagId: t.tagId })),
    })
  }
}

// ─────────────────────────────────────────────
// Helpers exportés (utilisés par tests + autres services)
// ─────────────────────────────────────────────

/** Mappe un slug v2 vers la valeur de l'enum legacy `TypeOpportunite` (colonne pleine de transition). */
export function legacyTypeFromSlug(slug: SousTypeSlug): 'Emploi' | 'Stage' | 'Formation' | 'Bourse' | 'Appel_a_projets' | 'Volontariat' {
  switch (slug) {
    case 'emploi':          return 'Emploi'
    case 'stage':           return 'Stage'
    case 'formation':       return 'Formation'
    case 'bourse':          return 'Bourse'
    case 'concours':        return 'Appel_a_projets' // pas d'équivalent dans l'enum legacy — mappé en attendant 178d
    case 'appel_a_projets': return 'Appel_a_projets'
    // Sous-types post-audit — mapping vers enum legacy le plus proche (en attendant 178d).
    case 'financement':     return 'Bourse'
    case 'mentorat':        return 'Formation'
    case 'mobilite':        return 'Bourse'
    case 'volontariat':     return 'Volontariat'
  }
}

/**
 * Cast runtime → discriminated union. Vérifie que la ligne chargée respecte l'invariant
 * (typeRef présent + exactement 1 sous-type non null aligné avec `typeRef.slug`).
 * Lève une erreur diagnostique sinon (corruption data ou ligne legacy non encore migrée).
 */
export function assertAvecDetails(row: unknown): OpportuniteAvecDetails {
  if (!row || typeof row !== 'object') {
    throw new Error('assertAvecDetails: row null/undefined')
  }
  const r = row as OpportuniteCore & {
    emploi: OpportuniteEmploi | null
    stage: OpportuniteStage | null
    formation: OpportuniteFormation | null
    bourse: OpportuniteBourse | null
    concours: OpportuniteConcours | null
    appelAProjets: OpportuniteAppelAProjets | null
    financement: OpportuniteFinancement | null
    mentorat: OpportuniteMentorat | null
    mobilite: OpportuniteMobilite | null
    volontariat: OpportuniteVolontariat | null
  }
  if (!r.typeRef) {
    throw new Error(`Opportunite ${r.id}: typeRef manquant (migration data 178c/d non appliquée ?)`)
  }
  const present = [
    r.emploi && 'emploi',
    r.stage && 'stage',
    r.formation && 'formation',
    r.bourse && 'bourse',
    r.concours && 'concours',
    r.appelAProjets && 'appel_a_projets',
    r.financement && 'financement',
    r.mentorat && 'mentorat',
    r.mobilite && 'mobilite',
    r.volontariat && 'volontariat',
  ].filter(Boolean) as string[]
  if (present.length !== 1) {
    throw new Error(
      `Opportunite ${r.id}: invariant XOR violé (sous-types présents: ${present.join(',') || 'aucun'})`,
    )
  }
  if (present[0] !== r.typeRef.slug) {
    throw new Error(
      `Opportunite ${r.id}: sous-type "${present[0]}" incohérent avec typeRef.slug="${r.typeRef.slug}"`,
    )
  }
  return r as OpportuniteAvecDetails
}
