'use server'
import { assertFlag } from '@/lib/flags/guard'

/**
 * GUIC-490 (US-8) — Création d'offre par le recruteur.
 *
 * L'offre part TOUJOURS en `brouillon` → file de modération CJS existante (GUIC-471) ;
 * le recruteur ne publie jamais directement. `recruteurUid` + organisation sont forcés
 * depuis la session/contexte (anti-spoofing). Types restreints à Emploi/Stage (lot 1).
 * Écriture déléguée à `OpportuniteService` (invariant XOR mère + sous-type).
 */
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { OpportuniteService, type CreateOpportuniteInput } from '@/lib/services/opportunite-service'
import { getRecruteurContext } from '@/lib/loaders/recruteur'
import { verifierGatePublication } from '@/lib/decouplage/publication-gate'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import { generateUniqueSlug } from '@/lib/slug'
import { assertAuMoinsUnProgramme } from '@/lib/programmes/rattachement'
import type { CJSSession } from '@/types/user'
import { DOMAINES_VISIBLES } from '@/lib/domaines'

// ── Enums (miroir prisma/schema.prisma) ─────────────────────────────────────────
// GUIC-689 — plus de miroir manuel de l'enum : source unique `@/lib/domaines`.
// `Autre` est exclu volontairement — un recruteur ne dépose pas « non classé ».
const DOMAINES = DOMAINES_VISIBLES
const REGIONS = ['Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou'] as const
const NIVEAUX = ['BFEM', 'BAC', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_5', 'DOCTORAT'] as const
const TYPE_CONTRAT = ['CDI', 'CDD', 'FREELANCE', 'ALTERNANCE', 'STAGE_ALTERNE'] as const

const baseSchema = z.object({
  titre: z.string().trim().min(1, 'Titre requis').max(255),
  description: z.string().trim().min(1, 'Description requise'),
  domaine: z.enum(DOMAINES),
  region: z.enum(REGIONS).nullish(),
  remuneration: z.string().trim().max(100).nullish(),
  deadline: z.string().trim().nullish(),
  // GUIC-515 — compétences requises (ids Skill) → alimentent le score d'adéquation IA.
  skills: z.array(z.string().min(1)).max(15).optional(),
  // GUIC-684 — programme(s) de rattachement : le recruteur les choisit à la création.
  // L'admin peut les corriger à la modération, mais l'offre n'entre jamais sans.
  programmeSlugs: z.array(z.string().trim().min(1)).optional().default([]),
  programmePrincipalSlug: z.string().trim().nullish(),
})

const emploiSchema = baseSchema.extend({
  type: z.literal('emploi'),
  typeContrat: z.enum(TYPE_CONTRAT),
  dureeContratMois: z.coerce.number().int().positive().nullish(),
  experienceRequise: z.string().trim().max(255).nullish(),
  teletravail: z.coerce.boolean().optional(),
  niveauEtudeMin: z.enum(NIVEAUX).nullish(),
})

const stageSchema = baseSchema.extend({
  type: z.literal('stage'),
  dureeMois: z.coerce.number({ invalid_type_error: 'Durée requise' }).int().positive('Durée requise'),
  indemnise: z.coerce.boolean().optional(),
  indemniteMensuelleFcfa: z.coerce.number().int().nonnegative().nullish(),
  conventionneEcole: z.coerce.boolean().optional(),
  niveauEtudeMin: z.enum(NIVEAUX).nullish(),
  dateDebutPrevue: z.string().trim().nullish(),
})

const inputSchema = z.discriminatedUnion('type', [emploiSchema, stageSchema])

/** Entrée acceptée par le formulaire recruteur (les nombres peuvent arriver en string). */
export type CreerOffreRecruteurInput = z.input<typeof inputSchema>

/** Garde de rôle recruteur — fail-closed. Retourne la session (acteur audit). */
async function assertRecruteur(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) throw new Error('FORBIDDEN')
  return session
}

function toDate(value?: string | null): Date | null {
  const v = value?.trim()
  return v ? new Date(v) : null
}

/** GUIC-706 (découplage) — issues métier renvoyées en {ok:false} (mappables en message UI clair). */
export type CreerOffreEchec = 'NO_ORGANISATION' | 'VALIDATION' | 'ORG_SUSPENDUE' | 'PERSONNE_INACTIVE' | 'NON_MEMBRE' | 'MEMBRE_INACTIF'
export type CreerOffreResult = { ok: true; id: string } | { ok: false; code: CreerOffreEchec }

/**
 * Crée une offre recruteur, soumise à validation CJS (`brouillon`).
 * Résultat discriminé : les échecs MÉTIER (gate de publication, org absente, champs invalides)
 * reviennent en `{ ok:false, code }` — mappables en message clair côté formulaire (Next masque
 * le message des throw en prod). @throws FORBIDDEN (non-recruteur) — garde de sécurité.
 */
export async function creerOffreRecruteur(raw: CreerOffreRecruteurInput): Promise<CreerOffreResult> {
  await assertFlag('m9.offres')
  const session = await assertRecruteur()

  const ctx = await getRecruteurContext(session.cjsUid)
  if (!ctx.organisationId || !ctx.organisationNom) return { ok: false, code: 'NO_ORGANISATION' }

  // GUIC-706 (découplage) — gate de publication : org active ET membre actif ET personne active.
  const gate = await verifierGatePublication(session.cjsUid, ctx.organisationId)
  if (!gate.ok) return { ok: false, code: gate.raison }

  const validation = inputSchema.safeParse(raw)
  if (!validation.success) return { ok: false, code: 'VALIDATION' }
  const parsed = validation.data
  // GUIC-684 — au moins un programme de rattachement (échoue avant de réserver un slug).
  assertAuMoinsUnProgramme(parsed.programmeSlugs)

  const slug = await generateUniqueSlug(parsed.titre, async (s) =>
    (await prisma.opportunite.findUnique({ where: { slug: s }, select: { id: true } })) !== null,
  )

  // Champs mère — statut/recruteurUid/organisation FORCÉS (jamais issus du client).
  const base = {
    titre: parsed.titre.trim(),
    slug,
    // GUIC-506 — corps riche saisi par un tiers (recruteur) : sanitisation serveur stricte.
    description: sanitizeRichHtml(parsed.description),
    organisationId: ctx.organisationId,
    organisationLibelle: ctx.organisationNom,
    domaine: parsed.domaine,
    region: parsed.region ?? null,
    remuneration: parsed.remuneration?.trim() || null,
    deadline: toDate(parsed.deadline),
    statut: 'brouillon' as const,
    recruteurUid: session.cjsUid,
    skills: (parsed.skills ?? []).map((skillId) => ({ skillId })),
    programmeSlugs: parsed.programmeSlugs,
    programmePrincipalSlug: parsed.programmePrincipalSlug ?? null,
  }

  const input: CreateOpportuniteInput =
    parsed.type === 'emploi'
      ? {
          type: 'emploi',
          base,
          details: {
            typeContrat: parsed.typeContrat,
            dureeContratMois: parsed.dureeContratMois ?? null,
            experienceRequise: parsed.experienceRequise?.trim() || null,
            teletravail: parsed.teletravail ?? false,
            niveauEtudeMin: parsed.niveauEtudeMin ?? null,
          },
        }
      : {
          type: 'stage',
          base,
          details: {
            dureeMois: parsed.dureeMois,
            indemnise: parsed.indemnise ?? false,
            indemniteMensuelleFcfa: parsed.indemniteMensuelleFcfa ?? null,
            conventionneEcole: parsed.conventionneEcole ?? false,
            niveauEtudeMin: parsed.niveauEtudeMin ?? null,
            dateDebutPrevue: toDate(parsed.dateDebutPrevue),
          },
        }

  const created = await new OpportuniteService(prisma).create(input)

  await recordAudit(session.cjsUid, 'opportunite.create', {
    targetType: 'opportunite',
    targetId: created.id,
    meta: { type: parsed.type, statut: 'brouillon', via: 'recruteur' },
  })

  revalidatePath('/recruteur/mes-offres')
  revalidatePath('/admin/opportunites') // apparaît dans la file de modération CJS
  return { ok: true, id: created.id }
}
