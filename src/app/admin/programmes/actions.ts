'use server'

/**
 * GUIC-684 — Reprise du stock : rattacher en masse les contenus restés sans programme.
 *
 * POURQUOI CETTE ACTION EXISTE : le rattachement est obligatoire depuis ce ticket,
 * mais tous les contenus antérieurs sont sans programme (4 340 opportunités sur la
 * base de travail au 2026-07-28). Sans reprise du stock, l'admin ne peut plus
 * enregistrer la moindre modification sur une fiche ancienne sans d'abord la
 * rattacher à la main — une par une.
 *
 * L'action ne touche QUE les contenus sans aucun rattachement : un contenu déjà
 * rattaché n'est jamais écrasé, et une seconde exécution ne crée rien (idempotence).
 */

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { ProgrammeInconnuError } from '@/lib/programmes/rattachement'

/** Entités portant un rattachement aux programmes (périmètre v1). */
const ENTITES = ['opportunite', 'ressource', 'evenement'] as const
type Entite = (typeof ENTITES)[number]

const entiteSchema = z.enum(ENTITES)
const slugSchema = z.string().trim().min(1)

async function assertAdmin(): Promise<string> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  return session.cjsUid
}

/** Compte les contenus d'un type donné qui ne relèvent d'aucun programme. */
export async function compterContenusSansProgramme(entite: Entite): Promise<number> {
  await assertAdmin()
  const e = entiteSchema.parse(entite)

  if (e === 'opportunite') {
    return prisma.opportunite.count({ where: { deletedAt: null, programmes: { none: {} } } })
  }
  if (e === 'ressource') {
    return prisma.ressource.count({ where: { programmes: { none: {} } } })
  }
  return prisma.evenement.count({ where: { programmes: { none: {} } } })
}

/** Identifiants des contenus sans rattachement (bornés pour ne pas charger 4 340 ids d'un coup). */
async function idsSansProgramme(entite: Entite, take: number): Promise<string[]> {
  if (entite === 'opportunite') {
    const rows = await prisma.opportunite.findMany({
      where: { deletedAt: null, programmes: { none: {} } },
      select: { id: true },
      take,
    })
    return rows.map((r) => r.id)
  }
  if (entite === 'ressource') {
    const rows = await prisma.ressource.findMany({
      where: { programmes: { none: {} } },
      select: { id: true },
      take,
    })
    return rows.map((r) => r.id)
  }
  const rows = await prisma.evenement.findMany({
    where: { programmes: { none: {} } },
    select: { id: true },
    take,
  })
  return rows.map((r) => r.id)
}

/** Taille de lot : borne la mémoire ET la durée d'une server action sur 4 340 lignes. */
const LOT = 500

/**
 * Rattache au programme choisi TOUS les contenus du type donné qui n'en ont aucun.
 * Le programme devient `principal` (c'est leur seul rattachement).
 *
 * @returns nombre de contenus rattachés (0 si plus aucun orphelin → idempotent)
 */
export async function rattacherContenusSansProgramme(
  entite: Entite,
  programmeSlug: string,
): Promise<{ count: number }> {
  const cjsUid = await assertAdmin()
  const e = entiteSchema.parse(entite)
  const slug = slugSchema.parse(programmeSlug)

  const programme = await prisma.programme.findUnique({ where: { slug }, select: { id: true } })
  if (!programme) throw new ProgrammeInconnuError([slug])

  let count = 0
  // Boucle par lots : `findMany` ne renvoie plus les contenus traités au tour
  // précédent (ils ont désormais un rattachement), la boucle converge donc seule.
  for (;;) {
    const ids = await idsSansProgramme(e, LOT)
    if (ids.length === 0) break

    if (e === 'opportunite') {
      await prisma.opportuniteProgramme.createMany({
        data: ids.map((id) => ({ opportuniteId: id, programmeId: programme.id, principal: true })),
        skipDuplicates: true,
      })
    } else if (e === 'ressource') {
      await prisma.ressourceProgramme.createMany({
        data: ids.map((id) => ({ ressourceId: id, programmeId: programme.id, principal: true })),
        skipDuplicates: true,
      })
    } else {
      await prisma.evenementProgramme.createMany({
        data: ids.map((id) => ({ evenementId: id, programmeId: programme.id, principal: true })),
        skipDuplicates: true,
      })
    }
    count += ids.length
    if (ids.length < LOT) break
  }

  if (count > 0) {
    await recordAudit(cjsUid, 'opportunite.update', {
      targetType: e,
      targetId: `masse:${slug}`,
      meta: { action: 'rattachement_programme_masse', entite: e, programme: slug, count },
    })
  }

  revalidatePath('/admin/opportunites/gestion')
  revalidatePath('/admin/ressources')
  revalidatePath('/admin/evenements')
  return { count }
}
