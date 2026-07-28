/**
 * GUIC-684 — Chargement des programmes proposables dans les formulaires admin.
 *
 * La table `Programme` est la SOURCE UNIQUE du référentiel : `src/lib/programmes.ts`
 * ne conserve que le mapping `slug → gradient` pour l'affichage. Avant ce ticket, les
 * deux cohabitaient avec des descriptions divergentes (YEAH n'avait pas le même nom
 * complet des deux côtés).
 */
import type { PrismaClient } from '@prisma/client'

export interface ProgrammeOption {
  slug: string
  nom: string
}

/** Programmes actifs, triés par nom — proposés à la sélection dans l'admin. */
export async function loadProgrammeOptions(
  db: Pick<PrismaClient, 'programme'>,
): Promise<ProgrammeOption[]> {
  const rows = await db.programme.findMany({
    where: { actif: true },
    orderBy: { nom: 'asc' },
    select: { slug: true, nom: true },
  })
  return rows
}
