/**
 * M13 / Data Hub — volume actuel de chaque flux, côté Guichet.
 *
 * POURQUOI
 * Le dictionnaire dit ce qu'un flux CONTIENDRAIT ; il ne dit pas s'il contient quelque
 * chose. Or un flux vide ne produit aucune erreur : il traverse l'extraction, dbt et la
 * réconciliation sans un seul signal, et ressort en tableau de bord vide côté BI. C'est le
 * mode de défaillance qui a donné `v_programs_summary` en mode dégradé. Un comptage à côté
 * de chaque flux le rend visible immédiatement.
 *
 * COMPTAGE NON BORNÉ — assumé, contrairement à `/api/v1/export/counts` qui exige un
 * `since`. La question n'est pas la même : cet endpoint-là compare une FENÊTRE avec
 * l'entrepôt après un run, ici on veut le total. Le coût est contenu autrement — la route
 * qui l'expose met le résultat en cache et le charge hors du rendu de la page.
 */
import { allDescriptors } from './descriptor'
import { allFullTableDescriptors } from './full-table-descriptor'

export interface CountDelegate {
  count(args?: Record<string, unknown>): Promise<number>
}

/** Volume par flux ; `null` quand le comptage a échoué pour ce flux-là. */
export type Volumes = Record<string, number | null>

/** Nom du délégué Prisma d'un modèle (`Utilisateur` → `utilisateur`). */
export function nomDelegue(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1)
}

/**
 * Compte chaque flux du contrat.
 *
 * Un échec est isolé au flux concerné (`null`) : une table verrouillée ou un modèle absent
 * ne doit pas priver l'administrateur des dix-huit autres comptages — la page servirait
 * alors à rien précisément quand quelque chose ne va pas.
 */
export async function compterVolumes(client: Record<string, CountDelegate>): Promise<Volumes> {
  const flux = [...allDescriptors(), ...allFullTableDescriptors()]

  const entrees = await Promise.all(
    flux.map(async (descripteur) => {
      const delegue = client[nomDelegue(descripteur.model)]
      try {
        return [descripteur.name, delegue ? await delegue.count() : null] as const
      } catch {
        return [descripteur.name, null] as const
      }
    }),
  )

  return Object.fromEntries(entrees)
}
