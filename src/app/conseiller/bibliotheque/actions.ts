'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { confirmerEmprunt, retournerEmprunt, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-521 — Le conseiller (bibliothécaire de son centre) confirme un retrait
 * ou enregistre un retour. Réemploi du service ; périmètre = centre AgentCentre
 * (staffCentreId), traçabilité via confirmePar = cjsUid du conseiller.
 */
async function guard() {
  const session = await getSession()
  if (!session) return { error: { code: 'UNAUTHENTICATED', message: 'Session requise.' } as const }
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return { error: { code: 'FORBIDDEN', message: 'Accès conseiller requis.' } as const }
  return { session, ctx }
}

export async function confirmerRetrait(empruntId: string): Promise<ApiResponse<{ id: string }>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  try {
    await confirmerEmprunt({ empruntId, staffCentreId: g.ctx.centreId, staffCjsUid: g.session.cjsUid })
    revalidatePath('/conseiller/bibliotheque')
    return { data: { id: empruntId } }
  } catch (e) {
    if (e instanceof BiblioDomainError) return { error: { code: e.code, message: 'Action impossible sur cet emprunt.' } }
    throw e
  }
}

export async function enregistrerRetour(empruntId: string): Promise<ApiResponse<{ id: string }>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  try {
    await retournerEmprunt({ empruntId, staffCentreId: g.ctx.centreId })
    revalidatePath('/conseiller/bibliotheque')
    return { data: { id: empruntId } }
  } catch (e) {
    if (e instanceof BiblioDomainError) return { error: { code: e.code, message: 'Action impossible sur cet emprunt.' } }
    throw e
  }
}
