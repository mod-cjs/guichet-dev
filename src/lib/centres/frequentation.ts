/**
 * GUIC-689 (M4, lot 4) — État de fréquentation d'un centre, pour la journée.
 *
 * Deux principes de la spec `.agent_context/specs/M4-checkin-checkout-scan.md` :
 *
 *  - **D-2, aucune clôture automatique.** « Qui est présent » se CALCULE ici,
 *    à la lecture — entrées du jour sans sortie appariée. Rien n'est stocké, et
 *    une entrée oubliée reste ouverte : son absence de sortie est
 *    l'information vraie.
 *
 *  - **rien d'inventé.** Beaucoup partiront sans scanner. On publie donc la
 *    part réellement mesurée plutôt qu'une moyenne adossée à des heures
 *    supposées. Sans aucune mesure, la moyenne vaut `null` — jamais 0, qui se
 *    lirait « ils sont repartis aussitôt ».
 */
import { prisma } from '@/lib/prisma'

export interface PresentAuCentre {
  cjsUid: string
  nom: string
  prenom: string
  /** Heure d'arrivée. */
  depuis: Date
}

export interface DureeFrequentation {
  /** Passages du jour. */
  passages: number
  /** Ceux dont la durée a pu être MESURÉE (sortie scannée et appariée). */
  mesures: number
  /** Part mesurée, en pourcentage entier. */
  partMesuree: number
  /** Moyenne des durées mesurées, `null` quand il n'y en a aucune. */
  moyenneMinutes: number | null
}

export interface EtatFrequentation {
  presents: PresentAuCentre[]
  duree: DureeFrequentation
}

/** Minuit local du jour courant. */
function debutDeJournee(maintenant = new Date()): Date {
  const d = new Date(maintenant)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function etatFrequentation(
  centreId: string,
  maintenant = new Date(),
): Promise<EtatFrequentation> {
  const depuis = debutDeJournee(maintenant)

  const passages = await prisma.checkIn.findMany({
    where: { centreId, effectueA: { gte: depuis } },
    select: {
      effectueA: true,
      cjsUid: true,
      utilisateur: { select: { nom: true, prenom: true } },
      // La relation 1-1 dit à la fois si la personne est repartie et combien de
      // temps elle est restée : une seule lecture suffit.
      sortie: { select: { dureeMinutes: true } },
    },
    orderBy: { effectueA: 'asc' },
  })

  const presents = passages
    .filter((p) => p.sortie === null)
    .map((p) => ({
      cjsUid: p.cjsUid,
      nom: p.utilisateur.nom,
      prenom: p.utilisateur.prenom,
      depuis: p.effectueA,
    }))

  // Une sortie ORPHELINE n'a pas de durée : elle ne compte pas comme mesure.
  const durees = passages
    .map((p) => p.sortie?.dureeMinutes)
    .filter((d): d is number => typeof d === 'number')

  const total = passages.length
  return {
    presents,
    duree: {
      passages: total,
      mesures: durees.length,
      partMesuree: total === 0 ? 0 : Math.round((durees.length / total) * 100),
      moyenneMinutes:
        durees.length === 0
          ? null
          : Math.round(durees.reduce((s, d) => s + d, 0) / durees.length),
    },
  }
}
