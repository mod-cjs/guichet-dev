/**
 * M13 / Data Hub — réconciliation automatisée des comptages (lot 5, spec §8.4).
 *
 * « Le pipeline n'a pas planté » et « le pipeline a tout extrait » sont deux choses
 * différentes : une extraction incrémentale mal bornée se termine proprement en ayant
 * perdu des lignes — c'est son mode de défaillance normal, silencieux par construction.
 * Le mode opératoire demandait jusqu'ici à un HUMAIN de comparer `/api/v1/export/counts`
 * aux `COUNT(*)` de l'entrepôt après chaque run ; une étape manuelle documentée mais non
 * outillée finit par ne plus être exécutée.
 *
 * Logique PURE — source (Guichet) et entrepôt (PostgreSQL) sont injectés, comme
 * `FindManyDelegate` dans `keyset.ts` : testable sans Prisma ni PostgreSQL réels. Le
 * script `scripts/datahub/reconcile.ts` fournit les implémentations réelles.
 */
import type { StreamDescriptor } from './descriptor'

export interface CountSource {
  /** Comptage source, filtré sur le champ Prisma (pas le nom exporté). */
  count(model: string, field: string, since: Date): Promise<number>
}

export interface WarehouseSource {
  /** Comptage entrepôt, filtré sur la colonne EXPORTÉE (le nom réel en base cible). */
  count(table: string, column: string, since: Date): Promise<number>
}

export interface ReconcileRow {
  stream: string
  source: number
  entrepot: number
  /** `null` si la comparaison n'a pas pu être faite (voir `erreur`). */
  ecart: number | null
  erreur?: string
}

export async function reconcile(
  descriptors: StreamDescriptor[],
  since: Date,
  source: CountSource,
  entrepot: WarehouseSource
): Promise<ReconcileRow[]> {
  return Promise.all(
    descriptors.map(async (d): Promise<ReconcileRow> => {
      // La colonne de réplication exportée diffère parfois du nom Prisma (GUIC-697 D1) :
      // `created_at` pour `consultations`, `effectue_a` pour `checkins`. Interroger
      // l'entrepôt sur le nom Prisma comparerait des fenêtres différentes de celles
      // réellement filtrées côté source.
      const colonneExportee =
        d.columns.find((c) => c.field === d.replicationKey)?.as ?? d.replicationKey

      try {
        const [n1, n2] = await Promise.all([
          source.count(d.model, d.replicationKey, since),
          entrepot.count(d.name, colonneExportee, since),
        ])
        // Positif = lignes manquantes dans l'entrepôt (le cas qui compte réellement) ;
        // négatif signalerait un doublon non absorbé par l'upsert — anormal aussi.
        return { stream: d.name, source: n1, entrepot: n2, ecart: n1 - n2 }
      } catch (e) {
        // Un flux dont la comparaison échoue est SIGNALÉ, jamais omis silencieusement —
        // sinon la panne de la réconciliation elle-même se confondrait avec un succès.
        return {
          stream: d.name,
          source: 0,
          entrepot: 0,
          ecart: null,
          erreur: e instanceof Error ? e.message : String(e),
        }
      }
    })
  )
}
