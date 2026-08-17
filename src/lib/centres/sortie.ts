/**
 * GUIC-689 (M4, lot 2) — Enregistrement d'une sortie de centre.
 *
 * Décisions de la spec `.agent_context/specs/M4-checkin-checkout-scan.md` :
 *
 *  - **D-4** appariement sur la DERNIÈRE entrée ouverte, même jeune, même
 *    centre. Les allers-retours dans la journée fonctionnent naturellement, et
 *    un oubli de sortie ne se colle pas à la visite suivante ;
 *  - **D-3** sortie orpheline acceptée : refuser au comptoir n'apprend rien à
 *    la personne et perd la trace ;
 *  - **D-2** aucune clôture automatique : une entrée sans sortie le reste. Son
 *    absence est une information vraie.
 *
 * La durée est calculée ICI, à l'insertion, et jamais recalculée : `check_ins`
 * est append-only et `effectueA` sert de watermark de réplication — reporter la
 * durée sur l'entrée la rendrait invisible à l'ETL.
 */
import type { CheckInVia } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export interface EntreeSortie {
  cjsUid: string
  centreId: string
  via: CheckInVia
  scannerId?: string | null
  /** Nonce du jeton scanné — rend l'opération idempotente. */
  jwtNonce?: string | null
}

export interface SortieEnregistree {
  id: string
  /** `null` pour une sortie orpheline. */
  checkInId: string | null
  /** `null` quand aucune entrée n'a pu être appariée. */
  dureeMinutes: number | null
}

/** Minutes écoulées, jamais négatives (une horloge peut dériver). */
function minutesDepuis(debut: Date, fin: Date): number {
  return Math.max(0, Math.round((fin.getTime() - debut.getTime()) / 60_000))
}

/**
 * Enregistre une sortie et l'apparie si possible.
 *
 * Idempotent sur `jwtNonce` : un jeton rejoué rend la sortie déjà créée plutôt
 * que d'en produire une seconde.
 */
export async function enregistrerSortie(entree: EntreeSortie): Promise<SortieEnregistree> {
  const { cjsUid, centreId, via, scannerId = null, jwtNonce = null } = entree

  if (jwtNonce) {
    const deja = await prisma.sortieCentre.findUnique({
      where: { jwtNonce },
      select: { id: true, checkInId: true, dureeMinutes: true },
    })
    if (deja) return deja
  }

  // Dernière entrée SANS sortie appariée. `sortie: null` s'appuie sur la
  // relation 1-1 : pas de sous-requête à maintenir à la main.
  const ouverte = await prisma.checkIn.findFirst({
    where: { cjsUid, centreId, sortie: null },
    orderBy: { effectueA: 'desc' },
    select: { id: true, effectueA: true },
  })

  const maintenant = new Date()

  try {
    return await prisma.sortieCentre.create({
      data: {
        checkInId: ouverte?.id ?? null,
        cjsUid,
        centreId,
        via,
        scannerId,
        jwtNonce,
        effectueA: maintenant,
        dureeMinutes: ouverte ? minutesDepuis(ouverte.effectueA, maintenant) : null,
      },
      select: { id: true, checkInId: true, dureeMinutes: true },
    })
  } catch (err) {
    // Deux scans simultanés ont visé la même entrée : la contrainte d'unicité a
    // tranché. On enregistre quand même la seconde, orpheline — perdre la trace
    // d'un passage au comptoir serait pire que de ne pas l'apparier.
    if (ouverte && estConflitUnicite(err)) {
      return await prisma.sortieCentre.create({
        data: { cjsUid, centreId, via, scannerId, jwtNonce, effectueA: maintenant },
        select: { id: true, checkInId: true, dureeMinutes: true },
      })
    }
    throw err
  }
}

function estConflitUnicite(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  )
}
