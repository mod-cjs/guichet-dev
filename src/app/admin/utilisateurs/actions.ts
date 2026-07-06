'use server'

/**
 * GUIC-526 — Actions admin « Rôles & rattachements » (fiche utilisateur).
 *
 * L'admin PROVISIONNE les périmètres (supervision, cf feedback_roles_candidatures) :
 * - rattacher/retirer un conseiller à un centre (`AgentCentre`)
 * - lier/créer l'organisation d'un recruteur (`Organisation.cjsUid`)
 * Le RÔLE lui-même s'attribue dans l'admin SSO (claim `cjs_roles`) — jamais ici.
 *
 * Toute action est journalisée via `recordAudit` (trail admin).
 */

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { RoleAgent } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'

export interface ActionResult {
  ok: boolean
  /** Code d'erreur stable pour l'UI : FORBIDDEN | VALIDATION | DEJA_RATTACHE | INTROUVABLE | ERREUR */
  error?: string
}

/** Garde de rôle — fail-closed, sans throw (résultat consommable par l'UI). */
async function requireAdmin(): Promise<{ cjsUid: string } | null> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) return null
  return { cjsUid: session.cjsUid }
}

function prismaCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : undefined
}

function revalidate(cjsUid: string) {
  revalidatePath('/admin/utilisateurs')
  revalidatePath(`/admin/utilisateurs/${cjsUid}`)
}

const rattachementSchema = z.object({
  cjsUid: z.string().uuid(),
  centreId: z.string().min(1),
  role: z.nativeEnum(RoleAgent).default(RoleAgent.conseiller),
})

export async function ajouterRattachementCentre(input: {
  cjsUid: string
  centreId: string
  role?: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }

  const parsed = rattachementSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'VALIDATION' }

  try {
    await prisma.agentCentre.create({
      data: {
        cjsUid: parsed.data.cjsUid,
        centreId: parsed.data.centreId,
        role: parsed.data.role,
      },
    })
  } catch (e) {
    // @@unique([cjsUid, centreId]) — déjà rattaché à ce centre.
    if (prismaCode(e) === 'P2002') return { ok: false, error: 'DEJA_RATTACHE' }
    return { ok: false, error: 'ERREUR' }
  }

  await recordAudit(admin.cjsUid, 'admin.rattachement_centre.ajout', {
    targetType: 'utilisateur',
    targetId: parsed.data.cjsUid,
    meta: { centreId: parsed.data.centreId, role: parsed.data.role },
  })
  revalidate(parsed.data.cjsUid)
  return { ok: true }
}

export async function retirerRattachementCentre(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }

  const parsedId = z.string().min(1).safeParse(id)
  if (!parsedId.success) return { ok: false, error: 'VALIDATION' }

  let deleted: { id: string; cjsUid: string }
  try {
    deleted = await prisma.agentCentre.delete({ where: { id: parsedId.data } })
  } catch (e) {
    if (prismaCode(e) === 'P2025') return { ok: false, error: 'INTROUVABLE' }
    return { ok: false, error: 'ERREUR' }
  }

  await recordAudit(admin.cjsUid, 'admin.rattachement_centre.retrait', {
    targetType: 'utilisateur',
    targetId: deleted.cjsUid,
    meta: { agentCentreId: deleted.id },
  })
  revalidate(deleted.cjsUid)
  return { ok: true }
}

const liaisonSchema = z.object({
  cjsUid: z.string().uuid(),
  organisationId: z.string().min(1),
})

export async function lierOrganisation(input: {
  cjsUid: string
  organisationId: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }

  const parsed = liaisonSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'VALIDATION' }

  try {
    await prisma.organisation.update({
      where: { id: parsed.data.organisationId },
      data: { cjsUid: parsed.data.cjsUid },
    })
  } catch (e) {
    if (prismaCode(e) === 'P2025') return { ok: false, error: 'INTROUVABLE' }
    return { ok: false, error: 'ERREUR' }
  }

  await recordAudit(admin.cjsUid, 'admin.organisation.liaison', {
    targetType: 'organisation',
    targetId: parsed.data.organisationId,
    meta: { cjsUid: parsed.data.cjsUid },
  })
  revalidate(parsed.data.cjsUid)
  return { ok: true }
}

const creationSchema = z.object({
  cjsUid: z.string().uuid(),
  nom: z.string().trim().min(2, 'Nom requis').max(200),
})

export async function creerOrganisationPourRecruteur(input: {
  cjsUid: string
  nom: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: 'FORBIDDEN' }

  const parsed = creationSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'VALIDATION' }

  let created: { id: string }
  try {
    created = await prisma.organisation.create({
      data: { cjsUid: parsed.data.cjsUid, nom: parsed.data.nom },
    })
  } catch {
    return { ok: false, error: 'ERREUR' }
  }

  await recordAudit(admin.cjsUid, 'admin.organisation.creation', {
    targetType: 'organisation',
    targetId: created.id,
    meta: { cjsUid: parsed.data.cjsUid, nom: parsed.data.nom },
  })
  revalidate(parsed.data.cjsUid)
  return { ok: true }
}
