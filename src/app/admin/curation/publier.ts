'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { OpportuniteService } from '@/lib/services/opportunite-service'
import { sanitizeOpportuniteRichFields } from '@/lib/opportunite/sanitize-base'
import { construireInputPublication, estSousTypeValide, type DonneesItem } from '@/lib/curation/publication/mapper'
import type { CJSSession } from '@/types/user'

/**
 * GUIC-601 — US-6 : publier un item `approuvee` vers le catalogue via le workflow existant
 * (`OpportuniteService.create`). Crée une `Opportunite` en `brouillon` (l'admin complète les
 * détails sous-type dans l'éditeur existant), lie `opportuniteId` (traçabilité + idempotence).
 * Le Knowledge Graph Yaye est alimenté par le cron `yaye-graph-sync` existant (prochain tick).
 */

async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  return session
}

export async function publierItem(id: string): Promise<{ opportuniteId: string }> {
  const session = await assertAdmin()

  const item = await prisma.itemCuration.findUnique({
    where: { id },
    include: { source: { select: { nom: true } } },
  })
  if (!item) throw new Error('NOT_FOUND')
  if (item.opportuniteId) throw new Error('DEJA_PUBLIE')
  if (item.statut !== 'approuvee') throw new Error('CONFLIT_STATUT : seul un item approuvé est publiable')

  // Type d'opportunité : slug du sous-type (requis par le workflow existant).
  const p = (item.payloadExtrait as Record<string, unknown> | null) ?? {}
  const typeId = typeof p.typeId === 'string' ? p.typeId : ''
  const type = typeId ? await prisma.opportuniteType.findUnique({ where: { id: typeId }, select: { slug: true } }) : null
  if (!type || !estSousTypeValide(type.slug)) {
    throw new Error('Type d’opportunité invalide ou non publiable — corrige-le avant publication')
  }

  const donnees: DonneesItem = {
    titre: item.titre ?? (typeof p.titre === 'string' ? p.titre : 'Opportunité'),
    description: typeof p.description === 'string' ? p.description : undefined,
    organisation: typeof p.organisation === 'string' ? p.organisation : undefined,
    region: typeof p.region === 'string' ? p.region : undefined,
    domaine: typeof p.domaine === 'string' ? p.domaine : undefined,
    deadline: typeof p.deadline === 'string' ? p.deadline : undefined,
    lienSource: item.urlCanonique,
  }

  const input = construireInputPublication(type.slug, donnees)
  // Sanitisation serveur des corps riches (comme le workflow admin standard). Cast : la
  // fonction est générique sur Record<string, unknown> que l'interface BaseInput ne satisfait pas.
  input.base = sanitizeOpportuniteRichFields(
    input.base as unknown as Record<string, unknown>,
  ) as unknown as typeof input.base

  const service = new OpportuniteService(prisma)
  const created = await service.create(input)

  // Lien de traçabilité + idempotence (empêche une republication).
  await prisma.itemCuration.update({ where: { id }, data: { opportuniteId: created.id } })

  await recordAudit(session.cjsUid, 'opportunite.create', {
    targetType: 'opportunite',
    targetId: created.id,
    meta: { origine: 'curation', itemId: id, source: item.source.nom },
  })
  await recordAudit(session.cjsUid, 'opportunite.publish', {
    targetType: 'opportunite',
    targetId: created.id,
    meta: { statut: 'brouillon', origine: 'curation' },
  })

  revalidatePath('/admin/curation')
  revalidatePath('/admin/opportunites')
  return { opportuniteId: created.id }
}
