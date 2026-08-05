'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { avecVerrouVeille } from '@/lib/curation/robot/verrou'
import { executerVeille } from '@/lib/curation/robot/run'
import { executerExtraction } from '@/lib/curation/extraction/run'
import { executerDedup } from '@/lib/curation/dedup/run'
import { clientHttpReel } from '@/lib/curation/robot/http-client'
import type { CJSSession } from '@/types/user'

async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  return session
}

export interface ResultatCollecte {
  ignore: boolean
  sourcesTraitees: number
  nbNouveautes: number
}

/**
 * GUIC-704 · Lot 2 — collecte de veille À LA DEMANDE (le manque #1 : le robot ne
 * tournait que par cron). Force la/les source(s) « due(s) » (`prochaineVerifLe = now`)
 * puis rejoue le pipeline complet (découverte → extraction → dédup) sous le verrou.
 * Fail-soft (erreurs par source déjà gérées) + audité. `sourceId` absent = toutes les actives.
 */
export async function lancerCollecte(sourceId?: string): Promise<ResultatCollecte> {
  const session = await assertAdmin()
  const now = new Date()

  if (sourceId) {
    const id = z.string().min(1).parse(sourceId)
    await prisma.sourceVeille.update({ where: { id }, data: { prochaineVerifLe: now } })
  } else {
    await prisma.sourceVeille.updateMany({ where: { actif: true, deletedAt: null }, data: { prochaineVerifLe: now } })
  }

  const res = await avecVerrouVeille(async () => {
    const client = clientHttpReel()
    const decouverte = await executerVeille({ client, sansVerrou: true })
    await executerExtraction({ client })
    await executerDedup()
    return decouverte
  })

  await recordAudit(session.cjsUid, 'veille.collecte_manuelle', { meta: { cible: sourceId ?? 'toutes' } })
  revalidatePath('/admin/sources-veille')
  revalidatePath('/admin/curation')
  revalidatePath('/admin/curation/monitoring')

  if ('ignore' in res && res.ignore) return { ignore: true, sourcesTraitees: 0, nbNouveautes: 0 }
  const rapport = res as { sourcesTraitees: number; nbNouveautes: number }
  return { ignore: false, sourcesTraitees: rapport.sourcesTraitees, nbNouveautes: rapport.nbNouveautes }
}
