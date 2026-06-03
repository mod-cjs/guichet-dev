/**
 * Migration data — Opportunite legacy → schéma polymorphique (M3 v2)
 * GUIC-185 (sous-story 178d/4)
 *
 * Sépare les colonnes legacy (`type` enum, `organisation` String) du nouveau
 * schéma polymorphique :
 *   - Renseigne `typeId` (FK → OpportuniteType) à partir de l'enum legacy
 *   - Copie `organisation` (String) → `organisationLibelle`
 *   - Crée la ligne sous-type 1:1 correspondante avec valeurs par défaut prudentes
 *
 * Idempotent : peut être rejoué sans dupliquer ni écraser. Vérifie l'existence
 * d'un sous-type avant insertion.
 *
 * Décisions :
 *   - §18 Q5 : Volontariat legacy fusionne dans APPEL_A_PROJETS (count-first ;
 *     règle automatique si ≥ 50 instances, flag _migration_review = true pour
 *     revue admin manuelle Phase 4)
 *   - §4.3 + §9 : valeurs par défaut documentées dans le commit body
 *   - §9.3 : pré-requis = tag git pre-migration-m3-v2 + dump SQL archivé
 *
 * Valeurs par défaut (Q5 Volontariat → APPEL_A_PROJETS) :
 *   - emploi          → typeContrat: 'CDD'
 *   - stage           → dureeMois: 6, indemnise: false
 *   - formation       → dureeHeures: 0, modalite: 'PRESENTIEL'
 *   - bourse          → montantTotalFcfa: 0, organismeFinanceur: 'À renseigner'
 *   - appel_a_projets → dossierRequis/criteresEligibilite: 'À renseigner'
 *
 * EXÉCUTION
 * ---------
 *   npx tsx scripts/migrate-opportunites-to-polymorphic.ts [--dry-run]
 *
 *   Variables :
 *     DATABASE_URL = mysql://user:pass@host:3306/guichet_jeunesse
 *
 * Pré-requis humains :
 *   1. `git tag pre-migration-m3-v2` sur le dernier commit dev
 *   2. `mysqldump guichet_jeunesse > data/dump-pre-m3-v2-<date>.sql`
 *   3. Migrations Prisma 182, 186, 183, 184, 185 appliquées (`prisma migrate deploy`)
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 100
const VOLONTARIAT_AUTO_THRESHOLD = 50

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('[migrate-m3-v2] DATABASE_URL manquante')
    process.exit(1)
  }
  const parsed = new URL(url)
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: parsed.hostname,
      port: Number(parsed.port) || 3306,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.replace(/^\//, ''),
      connectionLimit: 3,
      acquireTimeout: 60_000,
      connectTimeout: 30_000,
    }),
    log: ['error', 'warn'],
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TypeOpportuniteLegacy =
  | 'Emploi'
  | 'Stage'
  | 'Formation'
  | 'Bourse'
  | 'Volontariat'
  | 'Appel_a_projets'
  | 'AUTRE'

interface MigrationReport {
  startedAt: string
  finishedAt: string
  dryRun: boolean
  totalOpportunites: number
  volontariatCount: number
  volontariatStrategy: 'manual' | 'auto'
  perType: Record<string, number>
  subtypesCreated: Record<string, number>
  organisationLibelleBackfilled: number
  organisationIdResolved: number
  flaggedReview: number
  alreadyMigrated: number
  errors: { opportuniteId: string; message: string }[]
}

// Mapping enum legacy → slug OpportuniteType (cf. spec §4.3)
const TYPE_MAPPING: Record<TypeOpportuniteLegacy, string> = {
  Emploi: 'emploi',
  Stage: 'stage',
  Formation: 'formation',
  Bourse: 'bourse',
  Appel_a_projets: 'appel_a_projets',
  // Q5 §18 obsolète depuis §19 : sous-type Volontariat dédié maintenant disponible.
  // Volontariat legacy → sous-type volontariat (au lieu de appel_a_projets).
  Volontariat: 'volontariat',
  // Sécurité — si AUTRE découvert (ex. import Drupal corrompu) → appel_a_projets + flag review
  AUTRE: 'appel_a_projets',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString()
}

function logStep(msg: string): void {
  console.log(`[migrate-m3-v2 ${DRY_RUN ? 'DRY' : 'RUN'}] ${msg}`)
}

function ensureDataDir(): string {
  const dir = path.resolve(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function writeReport(report: MigrationReport): string {
  const dir = ensureDataDir()
  const ts = report.startedAt.replace(/[:.]/g, '-')
  const file = path.join(dir, `migrate_m3_v2_report_${ts}.json`)
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8')
  return file
}

// ─── Étape A — Count Volontariat (Q5) ────────────────────────────────────────

export async function countVolontariatLegacy(client: PrismaClient): Promise<number> {
  return client.opportunite.count({
    // 'AUTRE' n'est pas dans l'enum côté Prisma (sécurité) — on cherche Volontariat,
    // l'éventuel reliquat 'AUTRE' apparaîtra sur la requête raw côté script de revue.
    where: { type: { in: ['Volontariat'] } },
  })
}

// ─── Étape D — Création sous-type avec valeurs par défaut prudentes ──────────

interface SubtypeCreateContext {
  client: PrismaClient
  opportuniteId: string
  typeSlug: string
  domaineLegacy: string
  needsReview: boolean
}

async function ensureSubtype(ctx: SubtypeCreateContext): Promise<string | null> {
  const { client, opportuniteId, typeSlug } = ctx

  // Idempotence : on vérifie d'abord si le sous-type existe déjà
  switch (typeSlug) {
    case 'emploi': {
      if (await client.opportuniteEmploi.findUnique({ where: { opportuniteId } })) return null
      if (DRY_RUN) return 'emploi'
      await client.opportuniteEmploi.create({
        data: {
          opportuniteId,
          typeContrat: 'CDD', // défaut prudent — à compléter via UI admin
        },
      })
      return 'emploi'
    }
    case 'stage': {
      if (await client.opportuniteStage.findUnique({ where: { opportuniteId } })) return null
      if (DRY_RUN) return 'stage'
      await client.opportuniteStage.create({
        data: {
          opportuniteId,
          dureeMois: 6,
          indemnise: false,
        },
      })
      return 'stage'
    }
    case 'formation': {
      if (await client.opportuniteFormation.findUnique({ where: { opportuniteId } })) return null
      if (DRY_RUN) return 'formation'
      await client.opportuniteFormation.create({
        data: {
          opportuniteId,
          dureeHeures: 0,
          modalite: 'PRESENTIEL',
        },
      })
      return 'formation'
    }
    case 'bourse': {
      if (await client.opportuniteBourse.findUnique({ where: { opportuniteId } })) return null
      if (DRY_RUN) return 'bourse'
      await client.opportuniteBourse.create({
        data: {
          opportuniteId,
          montantTotalFcfa: 0,
          organismeFinanceur: 'À renseigner',
        },
      })
      return 'bourse'
    }
    case 'concours': {
      if (await client.opportuniteConcours.findUnique({ where: { opportuniteId } })) return null
      if (DRY_RUN) return 'concours'
      await client.opportuniteConcours.create({
        data: {
          opportuniteId,
          organismeOrganisateur: 'À renseigner',
        },
      })
      return 'concours'
    }
    case 'appel_a_projets': {
      if (await client.opportuniteAppelAProjets.findUnique({ where: { opportuniteId } }))
        return null
      if (DRY_RUN) return 'appel_a_projets'
      await client.opportuniteAppelAProjets.create({
        data: {
          opportuniteId,
          dossierRequis: 'À renseigner',
          criteresEligibilite: 'À renseigner',
        },
      })
      return 'appel_a_projets'
    }
    case 'volontariat': {
      if (await client.opportuniteVolontariat.findUnique({ where: { opportuniteId } }))
        return null
      if (DRY_RUN) return 'volontariat'
      await client.opportuniteVolontariat.create({
        data: {
          opportuniteId,
          dureeMois: 6, // défaut prudent — à compléter par admin Phase 4
          typeVolontariat: 'ENGAGEMENT',
          domaineMission: ctx.domaineLegacy || 'À renseigner',
        },
      })
      return 'volontariat'
    }
    default:
      throw new Error(`Slug sous-type inconnu : ${typeSlug}`)
  }
}

// ─── Étape C — Résolution organisationId best-effort ─────────────────────────

async function resolveOrganisationId(
  client: PrismaClient,
  organisationNom: string,
): Promise<string | null> {
  if (!organisationNom) return null
  const org = await client.organisation.findFirst({
    where: { nom: organisationNom },
    select: { id: true },
  })
  return org?.id ?? null
}

// ─── Boucle principale ───────────────────────────────────────────────────────

export async function migrateOpportunites(client: PrismaClient): Promise<MigrationReport> {
  const startedAt = nowIso()
  const report: MigrationReport = {
    startedAt,
    finishedAt: '',
    dryRun: DRY_RUN,
    totalOpportunites: 0,
    volontariatCount: 0,
    volontariatStrategy: 'manual',
    perType: {},
    subtypesCreated: {},
    organisationLibelleBackfilled: 0,
    organisationIdResolved: 0,
    flaggedReview: 0,
    alreadyMigrated: 0,
    errors: [],
  }

  // Étape A — count Volontariat (Q5 §18)
  const volontariatCount = await countVolontariatLegacy(client)
  report.volontariatCount = volontariatCount
  report.volontariatStrategy = volontariatCount >= VOLONTARIAT_AUTO_THRESHOLD ? 'auto' : 'manual'
  logStep(
    `Volontariat legacy : ${volontariatCount} → stratégie ${report.volontariatStrategy} (seuil ${VOLONTARIAT_AUTO_THRESHOLD})`,
  )

  // Charger une fois la map slug→id des OpportuniteType
  const types = await client.opportuniteType.findMany({
    select: { id: true, slug: true },
  })
  const slugToId = new Map(types.map((t) => [t.slug, t.id]))
  for (const slug of Object.values(TYPE_MAPPING)) {
    if (!slugToId.has(slug)) {
      throw new Error(
        `OpportuniteType slug "${slug}" introuvable — exécuter le seed avant migration data.`,
      )
    }
  }

  // Batch curseur sur les opportunités
  let cursor: string | undefined = undefined
  for (;;) {
    const batch: Array<{
      id: string
      type: TypeOpportuniteLegacy
      organisation: string
      organisationId: string | null
      organisationLibelle: string | null
      typeId: string | null
    }> = await client.opportunite.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        type: true,
        organisation: true,
        organisationId: true,
        organisationLibelle: true,
        typeId: true,
      },
    })

    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const opp of batch) {
      report.totalOpportunites += 1
      const legacyType = opp.type as TypeOpportuniteLegacy
      report.perType[legacyType] = (report.perType[legacyType] ?? 0) + 1

      const targetSlug = TYPE_MAPPING[legacyType]
      const targetTypeId = slugToId.get(targetSlug)!
      const isReviewCase = legacyType === 'Volontariat' || legacyType === 'AUTRE'

      try {
        await client.$transaction(async (tx) => {
          // Étape B — backfill typeId si manquant
          const updates: Record<string, unknown> = {}
          if (!opp.typeId) updates.typeId = targetTypeId

          // Étape C — backfill organisationLibelle (préserve la String legacy)
          if (!opp.organisationLibelle && opp.organisation) {
            updates.organisationLibelle = opp.organisation
            report.organisationLibelleBackfilled += 1
          }

          // Étape C bis — best-effort organisationId par lookup nom
          if (!opp.organisationId && opp.organisation) {
            const orgId = await resolveOrganisationId(tx as PrismaClient, opp.organisation)
            if (orgId) {
              updates.organisationId = orgId
              report.organisationIdResolved += 1
            }
          }

          if (Object.keys(updates).length > 0 && !DRY_RUN) {
            await tx.opportunite.update({
              where: { id: opp.id },
              data: updates,
            })
          }

          // Étape D — sous-type (idempotent)
          const created = await ensureSubtype({
            client: tx as PrismaClient,
            opportuniteId: opp.id,
            typeSlug: targetSlug,
            domaineLegacy: '',
            needsReview: isReviewCase,
          })

          if (created) {
            report.subtypesCreated[created] = (report.subtypesCreated[created] ?? 0) + 1
            if (isReviewCase) report.flaggedReview += 1
          } else {
            report.alreadyMigrated += 1
          }
        }, { maxWait: 30_000, timeout: 60_000 })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        report.errors.push({ opportuniteId: opp.id, message })
        logStep(`ERREUR sur ${opp.id} : ${message}`)
      }
    }

    logStep(`Traité ${report.totalOpportunites} opportunités…`)
  }

  report.finishedAt = nowIso()
  return report
}

// ─── Entrée ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logStep(`Démarrage migration (DRY_RUN=${DRY_RUN})`)
  const prisma = createPrisma()
  try {
    const report = await migrateOpportunites(prisma)
    const file = writeReport(report)
    logStep(`Rapport écrit : ${file}`)
    logStep(
      `Total: ${report.totalOpportunites} · sous-types créés: ${JSON.stringify(report.subtypesCreated)} · flag review: ${report.flaggedReview} · erreurs: ${report.errors.length}`,
    )
    process.exit(report.errors.length === 0 ? 0 : 2)
  } catch (err) {
    logStep(`FATAL : ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécution directe (pas en import depuis tests)
if (require.main === module) {
  void main()
}
