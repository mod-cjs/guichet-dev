'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { OpportuniteService } from '@/lib/services/opportunite-service'
import { sanitizeOpportuniteRichFields } from '@/lib/opportunite/sanitize-base'
import { assertAuMoinsUnProgramme } from '@/lib/programmes/rattachement'
import { construireInputPublication, estSousTypeValide, type DonneesItem } from '@/lib/curation/publication/mapper'
import type { CJSSession } from '@/types/user'

/**
 * GUIC-601 — US-6 : publier un item `approuvee` vers le catalogue via le workflow existant
 * (`OpportuniteService.create`). Crée une `Opportunite` en `brouillon` (l'admin complète les
 * détails sous-type dans l'éditeur existant), lie `opportuniteId` (traçabilité + idempotence).
 *
 * KG Yaye : `OpportuniteService.create` projette déjà le nœud dans le graphe, MAIS les
 * requêtes de reco Yaye filtrent `statut = publiee` — un brouillon curé n'est donc recommandé
 * qu'APRÈS complétion + passage `publiee` par l'admin dans l'éditeur. Le critère JIRA « KG
 * alimenté » est ainsi porté par le flux éditeur existant, pas par cette action.
 */

async function assertAdmin(): Promise<CJSSession> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  return session
}

/**
 * @param programmeSlugs programmes de rattachement choisis par l'admin (GUIC-684).
 *   Au moins un — le brouillon publié doit relever d'un programme comme tout contenu.
 */
export async function publierItem(
  id: string,
  programmeSlugs: string[] = [],
): Promise<{ opportuniteId: string }> {
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
    // lienExterne = contenu tiers (crawlé) : n'accepter que http(s) (anti-XSS `javascript:`).
    lienSource: /^https?:\/\//i.test(item.urlCanonique) ? item.urlCanonique : undefined,
  }

  // Garde placée APRÈS la validation de l'item : un item non publiable doit remonter
  // SON erreur (statut, type), pas celle du rattachement.
  assertAuMoinsUnProgramme(programmeSlugs)

  const input = construireInputPublication(type.slug, { ...donnees, programmeSlugs })
  // Sanitisation serveur des corps riches (comme le workflow admin standard). Cast : la
  // fonction est générique sur Record<string, unknown> que l'interface BaseInput ne satisfait pas.
  input.base = sanitizeOpportuniteRichFields(
    input.base as unknown as Record<string, unknown>,
  ) as unknown as typeof input.base

  const service = new OpportuniteService(prisma)
  const created = await service.create(input)

  // Revendication ATOMIQUE : un seul appel concurrent peut lier l'item (opportuniteId null
  // + statut approuvee). Le perdant supprime l'Opportunite qu'il vient de créer (compensation)
  // → jamais deux entrées catalogue ni d'orphelin pour un item déjà publié.
  const claim = await prisma.itemCuration.updateMany({
    where: { id, opportuniteId: null, statut: 'approuvee' },
    data: { opportuniteId: created.id },
  })
  if (claim.count === 0) {
    await prisma.opportunite.delete({ where: { id: created.id } }).catch(() => {})
    throw new Error('DEJA_PUBLIE')
  }

  // Audit honnête : c'est une CRÉATION de brouillon issue de la curation, pas une publication
  // (statut brouillon ; la publication réelle a lieu dans l'éditeur → 'opportunite.publish' là-bas).
  await recordAudit(session.cjsUid, 'opportunite.create', {
    targetType: 'opportunite',
    targetId: created.id,
    meta: { origine: 'curation', itemId: id, source: item.source.nom, statut: 'brouillon' },
  })

  revalidatePath('/admin/curation')
  revalidatePath('/admin/opportunites')
  return { opportuniteId: created.id }
}
