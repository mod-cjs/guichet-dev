/**
 * M13 / Data Hub — propagation des suppressions dures (lot 7, spec §8.5, rapport GUIC-693 R6).
 *
 * `Utilisateur` n'est jamais hard-deleted (soft-delete + anonymisation SSO, déjà propagé
 * par `softDelete: 'deletedAt'`). Mais `Emprunt`, `Centre`, `Evenement` et `Ressource` le
 * sont réellement (admin, ou `deleteMany` à l'anonymisation SSO) — SANS `softDelete`
 * déclaré : la ligne disparaît de MariaDB sans laisser de trace, et l'entrepôt accumule
 * un fantôme indéfiniment.
 *
 * Arbitrage tranché (2026-08-03) : une clé présente dans l'entrepôt mais absente d'une
 * liste FRAÎCHE et COMPLÈTE des clés source est supprimée PHYSIQUEMENT — pas de tombstone.
 * Un `cjs_uid` resté en base après une demande d'effacement serait un risque CDP réel ;
 * les modèles marts sont de simples `select` depuis les sources (pas de snapshot
 * historisé), donc la suppression en `guichet_raw` s'y propage sans logique dbt
 * supplémentaire.
 *
 * Appliqué UNIFORMÉMENT aux 13 flux, softDelete ou non : une ligne soft-deleted reste
 * listée par un inventaire complet des clés source (elle existe toujours, seulement
 * marquée) — jamais candidate à la suppression. Pas besoin de distinguer les flux par
 * présence de `softDelete`, ce qui évite un test « ce flux est-il concerné ? » qui serait
 * lui-même une source d'oubli si un flux futur ne déclare pas le sien par erreur.
 *
 * Logique PURE — source (Guichet) et entrepôt (PostgreSQL) injectés, comme `reconcile.ts`.
 * Le script `scripts/datahub/purge-absents.ts` fournit les implémentations réelles.
 */
import type { StreamDescriptor } from './descriptor'

export interface KeySource {
  /** Toutes les clés primaires ACTUELLES du flux, en une liste complète (pas paginée ici). */
  keys(model: string, primaryKey: string): Promise<string[]>
}

export interface WarehouseKeys {
  keys(table: string, column: string): Promise<string[]>
  /** Supprime les lignes dont la clé est dans `absentes`. Rend le nombre supprimé. */
  deleteMany(table: string, column: string, absentes: string[]): Promise<number>
}

export interface PurgeRow {
  stream: string
  /** `null` si la comparaison n'a pas pu être faite (voir `erreur`). */
  supprimees: number | null
  erreur?: string
}

export async function purgeAbsents(
  descriptors: StreamDescriptor[],
  source: KeySource,
  entrepot: WarehouseKeys
): Promise<PurgeRow[]> {
  return Promise.all(
    descriptors.map(async (d): Promise<PurgeRow> => {
      // Nom EXPORTÉ de la clé primaire (GUIC-697 D1 : même piège) — `cjsUid` (Prisma)
      // devient `cjs_uid` dans l'entrepôt. Interroger l'entrepôt sur le nom Prisma viserait
      // une colonne qui n'y existe pas.
      const colonneExportee = d.columns.find((c) => c.field === d.primaryKey)?.as ?? d.primaryKey

      try {
        const [clesSource, clesEntrepot] = await Promise.all([
          source.keys(d.model, d.primaryKey),
          entrepot.keys(d.name, colonneExportee),
        ])
        const presentes = new Set(clesSource)
        const absentes = clesEntrepot.filter((cle) => !presentes.has(cle))

        if (absentes.length === 0) {
          return { stream: d.name, supprimees: 0 }
        }
        const supprimees = await entrepot.deleteMany(d.name, colonneExportee, absentes)
        return { stream: d.name, supprimees }
      } catch (e) {
        // Un flux dont la comparaison échoue est SIGNALÉ, jamais omis silencieusement —
        // sinon la panne de la purge elle-même se confondrait avec « rien à supprimer ».
        return {
          stream: d.name,
          supprimees: null,
          erreur: e instanceof Error ? e.message : String(e),
        }
      }
    })
  )
}
