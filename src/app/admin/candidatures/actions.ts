'use server'

import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { getCandidatureDetail, type CandidatureDetail } from '@/lib/loaders/candidature-detail'

/**
 * Charge la fiche détail d'une candidature pour le slide-over admin (GUIC-692 PR-B).
 * Garde admin — supervision (lecture seule). Renvoie `null` si introuvable.
 */
export async function chargerCandidatureDetail(id: string): Promise<CandidatureDetail | null> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  if (!id) return null
  return getCandidatureDetail(id)
}
