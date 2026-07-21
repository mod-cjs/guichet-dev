import type { SourceVeille } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import type { ClientHttp } from './http-client'
import { decouvrirSource } from './discover'
import { prochaineVerif } from './intervalle'
import { normaliserUrlCanonique, empreinteUrl } from './url'

/**
 * GUIC-597 — US-2 : orchestrateur du robot de découverte.
 * Sélectionne les sources dues, découvre les liens (listing seul), déduplique par
 * empreinte d'URL, crée les `ItemCuration` (statut `decouvert`) et journalise chaque
 * exécution (`ExecutionVeille`). Verrou Redis anti-réentrance (le run peut dépasser la
 * période du cron). Politesse par défaut entre sources + Crawl-delay intra-source.
 */

const VERROU_CLE = 'curation:veille:lock'
const VERROU_TTL_S = 290 // < maxDuration (300 s)
const URL_MAX = 500

export interface RobotDeps {
  client: ClientHttp
  maintenant?: () => Date
  attendre?: (ms: number) => Promise<void>
  delaiPolitesseParDefautMs?: number
  /** Désactive le verrou Redis (tests d'intégration sans Redis). */
  sansVerrou?: boolean
}

export interface RapportVeille {
  sourcesTraitees: number
  nbNouveautes: number
  nbErreurs: number
  ignore?: boolean
}

const attenteReelle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function majSource(source: SourceVeille): Promise<void> {
  const now = new Date()
  await prisma.sourceVeille.update({
    where: { id: source.id },
    data: { derniereVerifLe: now, prochaineVerifLe: prochaineVerif(source.frequence, now) },
  })
}

async function traiterSource(
  source: SourceVeille,
  client: ClientHttp,
  maintenant: () => Date,
  attendre: (ms: number) => Promise<void>,
  delai: number,
): Promise<number> {
  const debut = maintenant()

  try {
    const { liens, bloqueParRobots } = await decouvrirSource(source, client, {
      attendre,
      delaiPolitesseMs: delai,
    })

    // Empreintes candidates (URL normalisée, bornée) dédupliquées dans le lot.
    const parEmpreinte = new Map<string, string>()
    for (const lien of liens) {
      try {
        const canon = normaliserUrlCanonique(lien)
        if (canon.length <= URL_MAX) parEmpreinte.set(empreinteUrl(canon), canon)
      } catch {
        /* lien non normalisable → ignoré */
      }
    }
    const nbLiens = parEmpreinte.size

    let nouveaux: Array<[string, string]> = []
    if (nbLiens) {
      const empreintes = [...parEmpreinte.keys()]
      const dejaVues = await prisma.itemCuration.findMany({
        where: { empreinte: { in: empreintes } },
        select: { empreinte: true },
      })
      const vues = new Set(dejaVues.map((i) => i.empreinte))
      nouveaux = [...parEmpreinte.entries()].filter(([e]) => !vues.has(e))
    }

    // Une source bloquée par robots OU qui ne rapporte plus aucun lien est signalée
    // `partiel` : c'est le signal exploité par le monitoring US-7 (chute à zéro).
    const statut: 'ok' | 'partiel' = bloqueParRobots || nbLiens === 0 ? 'partiel' : 'ok'

    // create(exec) + createMany(items) dans une transaction → journal cohérent.
    const insertes = await prisma.$transaction(async (tx) => {
      const exec = await tx.executionVeille.create({
        data: {
          sourceId: source.id,
          demarreLe: debut,
          dureeMs: maintenant().getTime() - debut.getTime(),
          nbLiensDecouverts: nbLiens,
          nbNouveautes: 0, // rectifié ci-dessous avec le count réel
          nbErreurs: 0,
          statut,
        },
      })
      if (!nouveaux.length) return 0
      const res = await tx.itemCuration.createMany({
        data: nouveaux.map(([empreinte, canon]) => ({
          sourceId: source.id,
          executionId: exec.id,
          urlCanonique: canon,
          empreinte,
          statut: 'decouvert' as const,
        })),
        skipDuplicates: true, // course inter-exécutions sur l'empreinte @unique
      })
      await tx.executionVeille.update({
        where: { id: exec.id },
        data: { nbNouveautes: res.count },
      })
      return res.count
    })

    await majSource(source)
    return insertes
  } catch (err) {
    const messageErreur = err instanceof Error ? err.message : String(err)
    logger.error('robot.veille.source_erreur', { sourceId: source.id, error: messageErreur })
    await prisma.executionVeille.create({
      data: {
        sourceId: source.id,
        demarreLe: debut,
        dureeMs: maintenant().getTime() - debut.getTime(),
        nbLiensDecouverts: 0,
        nbNouveautes: 0,
        nbErreurs: 1,
        statut: 'erreur',
        messageErreur,
      },
    })
    // Même en erreur, on repousse la prochaine vérif pour ne pas boucler sur une source cassée.
    await majSource(source)
    throw err
  }
}

export async function executerVeille(deps: RobotDeps): Promise<RapportVeille> {
  const maintenant = deps.maintenant ?? (() => new Date())
  const attendre = deps.attendre ?? attenteReelle
  const delai = deps.delaiPolitesseParDefautMs ?? 2000

  // Verrou anti-réentrance : un run en cours empêche un second (chevauchement cron).
  let verrouAcquis = false
  if (!deps.sansVerrou) {
    try {
      const ok = await redis.set(VERROU_CLE, String(maintenant().getTime()), 'EX', VERROU_TTL_S, 'NX')
      verrouAcquis = ok === 'OK'
      if (!verrouAcquis) {
        logger.info('robot.veille.deja_en_cours')
        return { sourcesTraitees: 0, nbNouveautes: 0, nbErreurs: 0, ignore: true }
      }
    } catch (e) {
      // Redis indisponible : on continue sans verrou plutôt que de bloquer la veille.
      logger.warn('robot.veille.verrou_indispo', { error: e instanceof Error ? e.message : String(e) })
    }
  }

  try {
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

    for (const source of sources) {
      if (sourcesTraitees > 0) await attendre(delai) // politesse entre sources (hôtes différents)
      sourcesTraitees += 1
      try {
        nbNouveautes += await traiterSource(source, deps.client, maintenant, attendre, delai)
      } catch {
        nbErreurs += 1 // déjà journalisé
      }
    }

    logger.info('robot.veille.termine', { sourcesTraitees, nbNouveautes, nbErreurs })
    return { sourcesTraitees, nbNouveautes, nbErreurs }
  } finally {
    if (verrouAcquis) await redis.del(VERROU_CLE).catch(() => {})
  }
}
