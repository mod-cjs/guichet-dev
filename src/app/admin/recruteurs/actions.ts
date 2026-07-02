'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import type { CJSSession } from '@/types/user'

/** Garde de rôle — fail-closed : retourne la session (acteur d'audit). */
async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

const cjsUidSchema = z.string().min(1, 'cjsUid requis')

/**
 * Activer / suspendre un compte recruteur (bascule `statut` actif ↔ inactif).
 * Ne touche jamais `anonymise` (suppression CDP). La création/attribution de rôle
 * reste côté SSO (`cjs_auth`).
 */
export async function basculerStatutRecruteur(cjsUid: string, actif: boolean): Promise<{ ok: true }> {
  const session = await assertAdmin()
  const uid = cjsUidSchema.parse(cjsUid)

  const user = await prisma.utilisateur.findUnique({ where: { cjsUid: uid }, select: { statut: true } })
  if (!user) throw new Error('NOT_FOUND')
  if (user.statut === 'anonymise') throw new Error('COMPTE_ANONYMISE')

  await prisma.utilisateur.update({
    where: { cjsUid: uid },
    data: { statut: actif ? 'actif' : 'inactif' },
  })
  await recordAudit(session.cjsUid, 'recruteur.statut', {
    targetType: 'utilisateur',
    targetId: uid,
    meta: { statut: actif ? 'actif' : 'inactif' },
  })
  revalidatePath('/admin/recruteurs')
  return { ok: true }
}
