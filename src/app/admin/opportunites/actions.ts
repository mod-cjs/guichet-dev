'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit, type AuditAction } from '@/lib/audit'
import type { CJSSession } from '@/types/user'
import type { StatutOpportunite } from '@prisma/client'

const idSchema = z.string().min(1, 'id requis')

/** Garde de rôle — fail-closed : retourne la session admin (acteur pour l'audit). */
async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

/**
 * Transition de modération : ne s'applique QU'aux opportunités `brouillon`
 * (idempotence + pas de re-modération d'une offre déjà publiée/archivée).
 * Journalise l'action (G3 — qui a approuvé/rejeté quoi).
 */
async function setStatutBrouillon(
  rawId: string,
  statut: StatutOpportunite,
  auditAction: AuditAction,
): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const id = idSchema.parse(rawId)

  const res = await prisma.opportunite.updateMany({
    where: { id, statut: 'brouillon', deletedAt: null },
    data: { statut },
  })
  if (res.count === 0) {
    throw new Error('NOT_FOUND_OR_NOT_BROUILLON')
  }

  // Traçabilité de la décision de modération (fail-soft).
  await recordAudit(session.cjsUid, auditAction, {
    targetType: 'opportunite',
    targetId: id,
    meta: { statut },
  })

  revalidatePath('/admin/opportunites')
  return { ok: true }
}

/** Approuver une publication en attente → `publiee`. */
export async function approuverOpportunite(id: string): Promise<{ ok: true }> {
  return setStatutBrouillon(id, 'publiee', 'opportunite.approve')
}

/** Rejeter une publication en attente → `archivee`. */
export async function rejeterOpportunite(id: string): Promise<{ ok: true }> {
  return setStatutBrouillon(id, 'archivee', 'opportunite.reject')
}
