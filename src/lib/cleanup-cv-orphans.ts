/**
 * GUIC-231 — Cleanup des CV orphelins sur Vercel Blob.
 *
 * Contexte : GUIC-229 a réglé 90 % des orphelins via lazy upload (le blob n'est
 * créé qu'au submit de la candidature). Restent des cas marginaux :
 *   - POST candidature échoue après upload
 *   - L'utilisateur change de CV après un submit raté
 *
 * Cette routine liste les blobs sous le prefix `cv/`, vérifie pour chacun s'il
 * est encore référencé dans `Candidature.cvUrl`, et supprime les blobs
 * orphelins plus vieux que `minAgeMs` (24 h par défaut).
 *
 * Utilisé par :
 *   - `scripts/cleanup-cv-orphans.ts` (CLI, dry-run par défaut)
 *   - `src/app/api/cron/cleanup-cv/route.ts` (cron Vercel)
 */

import { stockage, stockagePour } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const DEFAULT_MIN_AGE_MS = 24 * 60 * 60 * 1000 // 24 h
const CV_PREFIX = 'cv/'

export interface CleanupOptions {
  /** Si true, supprime réellement. Si false (défaut), liste seulement. */
  apply?: boolean
  /** Âge minimum (ms) avant qu'un orphelin soit considéré supprimable. */
  minAgeMs?: number
}

export interface CleanupResult {
  scanned: number
  orphans: number
  deleted: number
  errors: number
  durationMs: number
  /** URLs orphelines détectées (utile en dry-run). */
  orphanUrls: string[]
}

/**
 * Récupère l'ensemble des URLs de CV référencées en base.
 * Seule `Candidature.cvUrl` est concernée à ce jour (le profil jeune n'expose
 * pas de cvUrl dans le schéma actuel — GUIC-231).
 */
async function loadReferencedCvUrls(): Promise<Set<string>> {
  const candidatures = await prisma.candidature.findMany({
    where: { cvUrl: { not: null } },
    select: { cvUrl: true },
  })

  const refs = new Set<string>()
  for (const c of candidatures) {
    if (c.cvUrl) refs.add(c.cvUrl)
  }
  return refs
}

export async function cleanupCvOrphans(
  opts: CleanupOptions = {},
): Promise<CleanupResult> {
  const apply = opts.apply ?? false
  const minAgeMs = opts.minAgeMs ?? DEFAULT_MIN_AGE_MS

  const start = Date.now()
  const result: CleanupResult = {
    scanned: 0,
    orphans: 0,
    deleted: 0,
    errors: 0,
    durationMs: 0,
    orphanUrls: [],
  }

  const referenced = await loadReferencedCvUrls()
  const cutoff = Date.now() - minAgeMs

  let cursor: string | undefined
  do {
    // GUIC-565 — listage via le stockage ACTIF ; la suppression, elle, est résolue sur la
    // forme de chaque référence : un CV orphelin encore hébergé sur Vercel doit être purgé
    // par Vercel, même quand le pilote actif est MinIO. Sans cela, la purge CDP laisserait
    // derrière elle tous les fichiers antérieurs à la bascule.
    const page = await stockage().lister({ prefixe: CV_PREFIX, curseur: cursor })

    for (const objet of page.objets) {
      result.scanned += 1

      // Ne considérer que les fichiers assez vieux (laisse le temps au submit).
      if (objet.deposeLe.getTime() > cutoff) continue

      if (referenced.has(objet.reference)) continue

      result.orphans += 1
      result.orphanUrls.push(objet.reference)

      if (!apply) continue

      try {
        await stockagePour(objet.reference).supprimer(objet.reference)
        result.deleted += 1
      } catch (err) {
        result.errors += 1
        logger.error('cleanup-cv-orphans: suppression échouée', {
          reference: objet.reference,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    cursor = page.curseur
  } while (cursor)

  result.durationMs = Date.now() - start

  logger.info('cleanup-cv-orphans: done', {
    apply,
    scanned: result.scanned,
    orphans: result.orphans,
    deleted: result.deleted,
    errors: result.errors,
    durationMs: result.durationMs,
  })

  return result
}
