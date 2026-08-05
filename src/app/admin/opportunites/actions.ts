'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit, type AuditAction } from '@/lib/audit'
import { notifyRecruteurDecisionOpportunite } from '@/lib/notifications/opportunite-decision'
import { OpportuniteService, type CreateOpportuniteInput, type SousTypeSlug } from '@/lib/services/opportunite-service'
import { sanitizeOpportuniteRichFields } from '@/lib/opportunite/sanitize-base'
import { getModerationDetail, type ModerationDetail } from '@/lib/loaders/moderation-detail'
import type { CJSSession } from '@/types/user'
import type { Prisma, StatutOpportunite } from '@prisma/client'

const idSchema = z.string().min(1, 'id requis')

/** Garde de rôle — fail-closed : retourne la session admin (acteur pour l'audit). */
async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

/** Revalide les vues admin des opportunités (file de modération + gestion). */
function revalidateAdmin(): void {
  revalidatePath('/admin/opportunites')
  revalidatePath('/admin/opportunites/gestion')
}

// ─────────────────────────────────────────────────────────────────────────────
// Modération (GUIC-462 + GUIC-471) — approuver / rejeter / publier directement.
// La décision (qui / quand / motif) est désormais tracée SUR l'offre en plus de
// l'audit : colonnes `moderePar` / `modereLe` / `motifRejet` (migration GUIC-471).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transition de modération : ne s'applique QU'aux opportunités `brouillon`
 * (idempotence + pas de re-modération d'une offre déjà publiée/archivée).
 * Trace le décideur sur l'offre + journalise l'action (G3 — qui a décidé quoi).
 */
async function setStatutBrouillon(
  rawId: string,
  statut: StatutOpportunite,
  auditAction: AuditAction,
  motifRejet?: string,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const id = idSchema.parse(rawId)
  const reason = motifRejet?.trim() || null

  const res = await prisma.opportunite.updateMany({
    where: { id, statut: 'brouillon', deletedAt: null },
    data: {
      statut,
      moderePar: session.cjsUid,
      modereLe: new Date(),
      // Le motif n'a de sens qu'au rejet ; à l'approbation/publication on l'efface.
      motifRejet: statut === 'archivee' ? reason : null,
    },
  })
  if (res.count === 0) {
    throw new Error('NOT_FOUND_OR_NOT_BROUILLON')
  }

  // Traçabilité de la décision de modération (fail-soft) — inclut le motif de rejet.
  await recordAudit(session.cjsUid, auditAction, {
    targetType: 'opportunite',
    targetId: id,
    meta: { statut, ...(reason ? { reason } : {}) },
  })

  // GUIC-547 — notifie le recruteur propriétaire (multicanal selon config). Fail-soft.
  if (statut === 'publiee' || statut === 'archivee') {
    await notifyRecruteurDecisionOpportunite(id, statut, reason)
  }

  revalidateAdmin()
  return { ok: true }
}

/** Charge la fiche complète d'une offre en modération (slide-over, PR-B). Garde admin. */
export async function chargerModerationDetail(id: string): Promise<ModerationDetail | null> {
  await assertAdmin()
  return getModerationDetail(idSchema.parse(id))
}

/** Approuver une publication en attente → `publiee`. */
export async function approuverOpportunite(id: string): Promise<{ ok: true }> {
  return setStatutBrouillon(id, 'publiee', 'opportunite.approve')
}

/**
 * Rejeter une publication en attente → `archivee`.
 * @param motif raison du rejet (M-M2 / GUIC-471) — persistée sur l'offre + journalisée.
 */
export async function rejeterOpportunite(id: string, motif?: string): Promise<{ ok: true }> {
  return setStatutBrouillon(id, 'archivee', 'opportunite.reject', motif)
}

/**
 * Publier directement un brouillon (GUIC-471 — backup recruteur).
 * Même transition que l'approbation, mais tracée comme `publish` (l'admin publie
 * lui-même, typiquement après avoir édité l'offre).
 */
export async function publierOpportunite(id: string): Promise<{ ok: true }> {
  return setStatutBrouillon(id, 'publiee', 'opportunite.publish')
}

/**
 * Demander une correction au recruteur (GUIC-702 · PR-C). L'offre RESTE `brouillon`
 * (aucun nouvel état enum) : on notifie le recruteur (in-app, fail-soft) + on trace
 * la demande. Le recruteur corrige et l'offre revient naturellement en file.
 */
export async function demanderCorrection(id: string, message: string): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const oid = idSchema.parse(id)
  const texte = z.string().trim().min(1, 'Message requis').max(1000).parse(message)

  const offre = await prisma.opportunite.findFirst({
    where: { id: oid, statut: 'brouillon', deletedAt: null },
    select: { titre: true, recruteurUid: true },
  })
  if (!offre) throw new Error('NOT_FOUND_OR_NOT_BROUILLON')

  await recordAudit(session.cjsUid, 'opportunite.correction_demandee', {
    targetType: 'opportunite',
    targetId: oid,
    meta: { message: texte },
  })

  // Notification in-app au recruteur propriétaire (fail-soft — jamais bloquant).
  if (offre.recruteurUid) {
    try {
      await prisma.notification.create({
        data: {
          cjsUid: offre.recruteurUid,
          type: 'System',
          titre: 'Correction demandée sur votre offre',
          contenu: `« ${offre.titre} » : ${texte}`,
          iconName: 'settings',
          lien: '/recruteur/mes-offres',
        },
      })
    } catch {
      /* notif best-effort */
    }
  }

  revalidateAdmin()
  return { ok: true }
}

/**
 * Approuver plusieurs offres en attente (sélection groupée / « Approuver les vérifiés »).
 * Chaque offre non-brouillon est ignorée (idempotence). Retourne le décompte.
 */
export async function approuverPlusieurs(ids: string[]): Promise<{ approuvees: number; ignorees: number }> {
  await assertAdmin()
  const valides = [...new Set(ids.map((i) => idSchema.parse(i)))]
  const res = await Promise.allSettled(valides.map((id) => approuverOpportunite(id)))
  const approuvees = res.filter((r) => r.status === 'fulfilled').length
  return { approuvees, ignorees: valides.length - approuvees }
}

/** Rejeter plusieurs offres avec un motif commun (sélection groupée). */
export async function rejeterPlusieurs(ids: string[], motif: string): Promise<{ rejetees: number; ignorees: number }> {
  await assertAdmin()
  const raison = z.string().trim().max(1000).parse(motif) || undefined
  const valides = [...new Set(ids.map((i) => idSchema.parse(i)))]
  const res = await Promise.allSettled(valides.map((id) => rejeterOpportunite(id, raison)))
  const rejetees = res.filter((r) => r.status === 'fulfilled').length
  return { rejetees, ignorees: valides.length - rejetees }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD (GUIC-28) — créer / modifier / archiver / supprimer.
// La création/édition délègue à `OpportuniteService` (invariant XOR mère+sous-type).
// ─────────────────────────────────────────────────────────────────────────────

const SOUS_TYPES: readonly SousTypeSlug[] = [
  'emploi', 'stage', 'formation', 'bourse', 'concours',
  'appel_a_projets', 'financement', 'mentorat', 'mobilite', 'volontariat',
] as const

const slugSchema = z
  .string()
  .trim()
  .min(1, 'Slug requis')
  .max(280)
  .regex(/^[a-z0-9-]+$/, 'Slug : minuscules, chiffres et tirets uniquement')

/**
 * Validation des champs mère communs. Les champs de sous-type (`details`) sont
 * typés par `CreateOpportuniteInput` et validés à l'écriture par le service / la
 * base (champs requis du sous-type) — on ne duplique pas ici les 10 schémas.
 */
const baseCoreSchema = z.object({
  titre: z.string().trim().min(1, 'Titre requis').max(255),
  slug: slugSchema,
  description: z.string().trim().min(1, 'Description requise'),
  organisationLibelle: z.string().trim().min(1, 'Organisation requise').max(200),
})

const typeSchema = z.enum(SOUS_TYPES as unknown as [SousTypeSlug, ...SousTypeSlug[]])

function service(): OpportuniteService {
  return new OpportuniteService(prisma)
}

/**
 * Créer une opportunité (admin). Statut `brouillon` par défaut, ou `publiee` si
 * publication directe (GUIC-471) → trace alors le décideur. Échoue si le slug existe.
 */
export async function creerOpportunite(input: CreateOpportuniteInput): Promise<{ id: string }> {
  const session = await assertAdmin()
  typeSchema.parse(input.type)
  const core = baseCoreSchema.parse(input.base)

  const exists = await prisma.opportunite.findUnique({
    where: { slug: core.slug },
    select: { id: true },
  })
  if (exists) throw new Error('SLUG_EXISTANT')

  const publieDirectement = input.base.statut === 'publiee'
  // GUIC-506 — sanitisation serveur des corps riches (description + sections) avant persistance.
  const base = sanitizeOpportuniteRichFields({ ...input.base, ...core })
  const created = await service().create({
    ...input,
    base,
  } as CreateOpportuniteInput)

  await recordAudit(session.cjsUid, 'opportunite.create', {
    targetType: 'opportunite',
    targetId: created.id,
    meta: { type: input.type, statut: created.statut },
  })
  if (publieDirectement) {
    // Publication directe admin (GUIC-471) → trace la décision sur l'offre + audit.
    await prisma.opportunite.update({
      where: { id: created.id },
      data: { moderePar: session.cjsUid, modereLe: new Date() },
    })
    await recordAudit(session.cjsUid, 'opportunite.publish', {
      targetType: 'opportunite',
      targetId: created.id,
    })
  }

  revalidateAdmin()
  return { id: created.id }
}

/** Type de patch accepté par `modifierOpportunite` (mère partielle + sous-type partiel). */
export type ModifierOpportunitePatch = Parameters<OpportuniteService['update']>[1]

/**
 * Modifier une opportunité existante (admin) — champs mère et/ou sous-type.
 * Le changement de type d'opportunité n'est pas supporté (protège l'historique
 * candidatures) — refus côté service.
 */
export async function modifierOpportunite(
  id: string,
  patch: ModifierOpportunitePatch,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const oid = idSchema.parse(id)
  if (patch.base?.slug !== undefined) slugSchema.parse(patch.base.slug)

  // GUIC-506 — sanitise les corps riches présents dans le patch (les champs
  // structurés et les clés absentes restent intacts → édition partielle préservée).
  const safePatch = patch.base
    ? { ...patch, base: sanitizeOpportuniteRichFields(patch.base) }
    : patch
  await service().update(oid, safePatch)

  await recordAudit(session.cjsUid, 'opportunite.update', {
    targetType: 'opportunite',
    targetId: oid,
  })
  revalidateAdmin()
  return { ok: true }
}

/** Archiver une opportunité (retrait volontaire, sans motif de rejet) → `archivee`. */
export async function archiverOpportunite(id: string): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const oid = idSchema.parse(id)
  const res = await prisma.opportunite.updateMany({
    where: { id: oid, deletedAt: null },
    data: { statut: 'archivee' },
  })
  if (res.count === 0) throw new Error('NOT_FOUND')
  await recordAudit(session.cjsUid, 'opportunite.update', {
    targetType: 'opportunite',
    targetId: oid,
    meta: { statut: 'archivee' },
  })
  revalidateAdmin()
  return { ok: true }
}

/**
 * Supprimer une opportunité (admin) — SOFT delete (`deletedAt`), jamais de hard
 * delete depuis l'UI : préserve l'historique des candidatures rattachées.
 */
export async function supprimerOpportunite(id: string): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const oid = idSchema.parse(id)
  const res = await prisma.opportunite.updateMany({
    where: { id: oid, deletedAt: null },
    data: { deletedAt: new Date() } satisfies Prisma.OpportuniteUpdateManyMutationInput,
  })
  if (res.count === 0) throw new Error('NOT_FOUND')
  await recordAudit(session.cjsUid, 'opportunite.delete', {
    targetType: 'opportunite',
    targetId: oid,
  })
  revalidateAdmin()
  return { ok: true }
}
