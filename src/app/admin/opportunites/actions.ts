'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import type { StatutOpportunite } from '@prisma/client'

const idSchema = z.string().min(1, 'id requis')

/** Garde de rôle — fail-closed : toute non-admin (ou session absente) est refusée. */
async function assertAdmin(): Promise<void> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
}

/**
 * Transition de modération : ne s'applique QU'aux opportunités `brouillon`
 * (idempotence + pas de re-modération d'une offre déjà publiée/archivée).
 */
async function setStatutBrouillon(rawId: string, statut: StatutOpportunite): Promise<{ ok: true }> {
  await assertAdmin()
  const id = idSchema.parse(rawId)

  const res = await prisma.opportunite.updateMany({
    where: { id, statut: 'brouillon', deletedAt: null },
    data: { statut },
  })
  if (res.count === 0) {
    throw new Error('NOT_FOUND_OR_NOT_BROUILLON')
  }

  revalidatePath('/admin/opportunites')
  return { ok: true }
}

/** Approuver une publication en attente → `publiee`. */
export async function approuverOpportunite(id: string): Promise<{ ok: true }> {
  return setStatutBrouillon(id, 'publiee')
}

/** Rejeter une publication en attente → `archivee`. */
export async function rejeterOpportunite(id: string): Promise<{ ok: true }> {
  return setStatutBrouillon(id, 'archivee')
}
