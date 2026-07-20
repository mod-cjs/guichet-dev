import type { SourceVeille } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { ClientHttp } from './http-client'
import { decouvrirSource } from './discover'
import { prochaineVerif } from './intervalle'
import { normaliserUrlCanonique, empreinteUrl } from './url'

/**
 * GUIC-597 — US-2 : orchestrateur du robot de découverte.
 * Sélectionne les sources dues, découvre les liens (listing seul), déduplique par
 * empreinte d'URL, crée les `ItemCuration` (statut `decouvert`) et journalise chaque
 * exécution (`ExecutionVeille`). Politesse entre sources via `attendre`.
 */

export interface RobotDeps {
  client: ClientHttp
  /** Horloge injectable (tests). Défaut : now. */
  maintenant?: () => Date
  /** Attente de politesse (tests : no-op). Défaut : setTimeout. */
  attendre?: (ms: number) => Promise<void>
  /** Délai de politesse par défaut entre requêtes (ms). Défaut 2000. */
  delaiPolitesseParDefautMs?: number
}

export interface RapportVeille {
  sourcesTraitees: number
  nbNouveautes: number
  nbErreurs: number
}

const attenteReelle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

interface ResultatSource {
  nbNouveautes: number
  /** Crawl-delay annoncé par la source (ms), pour dimensionner la politesse suivante. */
  crawlDelayMs: number | null
}

async function traiterSource(
  source: SourceVeille,
  deps: Required<Pick<RobotDeps, 'client'>> & { maintenant: () => Date },
): Promise<ResultatSource> {
  const debut = deps.maintenant()
  let statut: 'ok' | 'partiel' | 'erreur' = 'ok'
  let messageErreur: string | null = null

  try {
    const { liens, crawlDelayMs } = await decouvrirSource(source, deps.client)

    // Empreintes candidates (URL normalisée) dédupliquées dans le lot.
    const parEmpreinte = new Map<string, string>()
    for (const lien of liens) {
      try {
        const canon = normaliserUrlCanonique(lien)
        parEmpreinte.set(empreinteUrl(canon), canon)
      } catch {
        /* lien non normalisable → ignoré */
      }
    }

    if (parEmpreinte.size) {
      const empreintes = [...parEmpreinte.keys()]
      const dejaVues = await prisma.itemCuration.findMany({
        where: { empreinte: { in: empreintes } },
        select: { empreinte: true },
      })
      const vues = new Set(dejaVues.map((i) => i.empreinte))
      const nouveaux = [...parEmpreinte.entries()].filter(([e]) => !vues.has(e))

      if (nouveaux.length) {
        const exec = await prisma.executionVeille.create({
          data: {
            sourceId: source.id,
            demarreLe: debut,
            dureeMs: deps.maintenant().getTime() - debut.getTime(),
            nbNouveautes: nouveaux.length,
            nbErreurs: 0,
            statut: 'ok',
          },
        })
        const res = await prisma.itemCuration.createMany({
          data: nouveaux.map(([empreinte, canon]) => ({
            sourceId: source.id,
            executionId: exec.id,
            urlCanonique: canon,
            empreinte,
            statut: 'decouvert' as const,
          })),
          skipDuplicates: true, // course inter-exécutions sur l'empreinte @unique
        })
        await majSource(source)
        return { nbNouveautes: res.count, crawlDelayMs }
      }
    }

    // Aucune nouveauté : on journalise quand même (monitoring US-7) + maj dates.
    await journaliser(source, debut, deps.maintenant(), 0, 0, 'ok', null)
    await majSource(source)
    return { nbNouveautes: 0, crawlDelayMs }
  } catch (err) {
    statut = 'erreur'
    messageErreur = err instanceof Error ? err.message : String(err)
    logger.error('robot.veille.source_erreur', { sourceId: source.id, error: messageErreur })
    await journaliser(source, debut, deps.maintenant(), 0, 1, statut, messageErreur)
    // Même en erreur, on repousse la prochaine vérif pour ne pas boucler sur une source cassée.
    await majSource(source)
    throw err
  }
}

async function journaliser(
  source: SourceVeille,
  debut: Date,
  fin: Date,
  nbNouveautes: number,
  nbErreurs: number,
  statut: 'ok' | 'partiel' | 'erreur',
  messageErreur: string | null,
): Promise<void> {
  await prisma.executionVeille.create({
    data: {
      sourceId: source.id,
      demarreLe: debut,
      dureeMs: fin.getTime() - debut.getTime(),
      nbNouveautes,
      nbErreurs,
      statut,
      messageErreur,
    },
  })
}

async function majSource(source: SourceVeille): Promise<void> {
  const now = new Date()
  await prisma.sourceVeille.update({
    where: { id: source.id },
    data: { derniereVerifLe: now, prochaineVerifLe: prochaineVerif(source.frequence, now) },
  })
}

export async function executerVeille(deps: RobotDeps): Promise<RapportVeille> {
  const maintenant = deps.maintenant ?? (() => new Date())
  const attendre = deps.attendre ?? attenteReelle
  const delai = deps.delaiPolitesseParDefautMs ?? 2000
  const now = maintenant()

  const sources = await prisma.sourceVeille.findMany({
    where: {
      actif: true,
      deletedAt: null,
      OR: [{ prochaineVerifLe: null }, { prochaineVerifLe: { lte: now } }],
    },
    orderBy: { prochaineVerifLe: 'asc' },
  })

  let nbNouveautes = 0
  let nbErreurs = 0
  let sourcesTraitees = 0
  // Délai de politesse à appliquer AVANT la prochaine source (dimensionné sur le
  // Crawl-delay de la source précédente si supérieur au défaut).
  let prochaineAttente = delai

  for (const source of sources) {
    if (sourcesTraitees > 0) await attendre(prochaineAttente)
    sourcesTraitees += 1
    try {
      const r = await traiterSource(source, { client: deps.client, maintenant })
      nbNouveautes += r.nbNouveautes
      prochaineAttente = Math.max(delai, r.crawlDelayMs ?? 0)
    } catch {
      nbErreurs += 1 // déjà journalisé dans traiterSource
      prochaineAttente = delai
    }
  }

  logger.info('robot.veille.termine', { sourcesTraitees, nbNouveautes, nbErreurs })
  return { sourcesTraitees, nbNouveautes, nbErreurs }
}
