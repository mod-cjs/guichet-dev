/**
 * M13 / Data Hub — colonnes date exportées (lot 4, spec §4, rapport GUIC-693 R1).
 *
 * Le pré-vol ne contrôlait les dates invalides que sur les 13 clés de réplication, alors
 * que le contrat exporte une trentaine de colonnes date. Preuve du rapport : une seule
 * `date_naissance = '0000-00-00'` sur la 5001ᵉ ligne du tri d'`utilisateurs` passait le
 * pré-vol (vert — il ne regardait pas cette colonne), puis faisait planter l'extraction en
 * HTTP 500 à la page 5, définitivement, le tri étant déterministe.
 *
 * Le crash a lieu à la LECTURE Prisma de la colonne brute (« Invalid time value »), avant
 * qu'une éventuelle transformation ne s'exécute : une colonne source de transformation
 * (`dateNaissance` → `tranche_age`) est donc incluse au même titre que les autres — que
 * `trancheAge` sache rendre « inconnu » une fois la valeur en main n'empêche pas Prisma de
 * lever avant d'y arriver.
 *
 * Dérivée du contrat (`descriptor.columns`) plutôt qu'énumérée à la main : la liste ne peut
 * pas se désynchroniser d'un ajout de colonne exportée.
 */
import type { StreamDescriptor } from './descriptor'
import type { ModelDoc } from './schema-doc'

export interface ColonneDate {
  stream: string
  table: string
  column: string
}

export function colonnesDateExportees(
  descriptors: StreamDescriptor[],
  models: ModelDoc[]
): ColonneDate[] {
  const out: ColonneDate[] = []

  for (const descriptor of descriptors) {
    const model = models.find((m) => m.model === descriptor.model)
    if (!model) continue

    for (const col of descriptor.columns) {
      const field = model.fields.find((f) => f.field === col.field)
      if (field?.type !== 'DateTime') continue
      out.push({ stream: descriptor.name, table: model.table, column: field.column })
    }
  }

  return out
}
