import { prisma } from '@/lib/prisma'
import type { StatutItemCuration } from '@prisma/client'

/**
 * GUIC-602 — US-7 : agrégation des stats de veille par source + détection d'alertes.
 * Lecture seule sur les données déjà collectées (ExecutionVeille, ItemCuration, SourceVeille).
 */

/** Nombre d'exécutions récentes examinées pour déclencher une alerte. */
export const FENETRE_ALERTE = 3

export type Alerte = 'erreur_repetee' | 'chute_zero' | null

export interface StatSource {
  sourceId: string
  nom: string
  actif: boolean
  nbRapportees: number
  nbApprouvees: number
  nbRejetees: number
  /** Taux d'approbation parmi les items décidés (approuvée+rejetée), 0..100, null si aucun décidé. */
  tauxApprobation: number | null
  tauxRejet: number | null
  derniereVerif: Date | null
  nbErreursRecentes: number
  alerte: Alerte
}

export interface ResumeCuration {
  nbSources: number
  nbEnAlerte: number
  parStatut: Record<string, number>
}

function pourcent(part: number, total: number): number | null {
  return total === 0 ? null : Math.round((part / total) * 100)
}

/** Détermine l'alerte à partir des N dernières exécutions (plus récente d'abord). */
export function evaluerAlerte(
  dernieres: Array<{ statut: string; nbLiensDecouverts: number }>,
  aProduitAvant: boolean,
): Alerte {
  if (dernieres.length < FENETRE_ALERTE) return null
  const fenetre = dernieres.slice(0, FENETRE_ALERTE)
  if (fenetre.every((e) => e.statut === 'erreur')) return 'erreur_repetee'
  // Chute à zéro : uniquement si la source a DÉJÀ produit (sinon ce n'est pas une chute).
  if (aProduitAvant && fenetre.every((e) => e.nbLiensDecouverts === 0)) return 'chute_zero'
  return null
}

export async function statsParSource(): Promise<StatSource[]> {
  const sources = await prisma.sourceVeille.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true, actif: true, derniereVerifLe: true },
  })

  // Comptes d'items par (source, statut) en une requête.
  const parItem = await prisma.itemCuration.groupBy({
    by: ['sourceId', 'statut'],
    _count: { _all: true },
  })
  const compte = new Map<string, number>()
  for (const g of parItem) compte.set(`${g.sourceId}|${g.statut}`, g._count._all)
  const compteFor = (sid: string, s: StatutItemCuration) => compte.get(`${sid}|${s}`) ?? 0

  const stats: StatSource[] = []
  for (const src of sources) {
    // N+1 borné : quelques exécutions récentes par source (fenêtre d'alerte + baseline).
    const execs = await prisma.executionVeille.findMany({
      where: { sourceId: src.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { statut: true, nbLiensDecouverts: true },
    })
    const aProduitAvant = execs.some((e) => e.nbLiensDecouverts > 0)
    const alerte = evaluerAlerte(execs, aProduitAvant)

    const nbApprouvees = compteFor(src.id, 'approuvee')
    const nbRejetees = compteFor(src.id, 'rejetee')
    const decides = nbApprouvees + nbRejetees
    const nbRapportees =
      nbApprouvees +
      nbRejetees +
      compteFor(src.id, 'a_valider') +
      compteFor(src.id, 'en_attente') +
      compteFor(src.id, 'doublon') +
      compteFor(src.id, 'decouvert')

    stats.push({
      sourceId: src.id,
      nom: src.nom,
      actif: src.actif,
      nbRapportees,
      nbApprouvees,
      nbRejetees,
      tauxApprobation: pourcent(nbApprouvees, decides),
      tauxRejet: pourcent(nbRejetees, decides),
      derniereVerif: src.derniereVerifLe,
      nbErreursRecentes: execs.slice(0, FENETRE_ALERTE).filter((e) => e.statut === 'erreur').length,
      alerte,
    })
  }
  return stats
}

export async function resumeCuration(): Promise<ResumeCuration> {
  const stats = await statsParSource()
  const parItem = await prisma.itemCuration.groupBy({ by: ['statut'], _count: { _all: true } })
  const parStatut: Record<string, number> = {}
  for (const g of parItem) parStatut[g.statut] = g._count._all
  return {
    nbSources: stats.length,
    nbEnAlerte: stats.filter((s) => s.alerte !== null).length,
    parStatut,
  }
}
