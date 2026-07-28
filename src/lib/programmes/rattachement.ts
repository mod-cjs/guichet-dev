/**
 * GUIC-684 — Rattachement générique aux programmes sectoriels (M:N).
 *
 * Prisma n'a pas de relation polymorphique : il existe une table de jonction par
 * entité (`opportunites_programmes`, `ressources_programmes`,
 * `evenements_programmes`), toutes de forme identique. Plutôt que de dupliquer la
 * logique trois fois, ce module la porte une seule fois et reçoit en paramètres
 * le délégué Prisma et le nom de la clé étrangère.
 *
 * Invariants (cf. spec §2 — `.agent_context/specs/programme-rattachements.md`) :
 *  - au plus UN `principal = true` par entité ;
 *  - le premier programme de la liste devient principal si aucun n'est désigné —
 *    le cas courant « un seul programme » ne coûte donc aucune décision à l'admin ;
 *  - au moins un programme (décision PO 2026-07-28) ;
 *  - un slug inconnu échoue bruyamment : un rattachement perdu en silence est
 *    invisible en base et se découvre des mois plus tard dans le graphe.
 */

/** Le rattachement demandé référence un programme qui n'existe pas. */
export class ProgrammeInconnuError extends Error {
  constructor(public readonly slugs: string[]) {
    super(`PROGRAMME_INCONNU: ${slugs.join(', ')}`)
    this.name = 'ProgrammeInconnuError'
  }
}

/** Aucun programme fourni alors qu'au moins un est exigé. */
export class ProgrammeRequisError extends Error {
  constructor() {
    super('PROGRAMME_REQUIS')
    this.name = 'ProgrammeRequisError'
  }
}

/** Sous-ensemble du client Prisma utilisé pour résoudre les slugs. */
interface ProgrammeLecteur {
  programme: {
    findMany(args: {
      where: { slug: { in: string[] } }
      select: { id: true; slug: true }
    }): Promise<{ id: string; slug: string }[]>
  }
}

/** Une ligne de rattachement, indépendamment de la table de destination. */
export interface RattachementRow {
  programmeId: string
  principal: boolean
}

/**
 * Port d'écriture vers une table de jonction. Les délégués Prisma sont typés par
 * table (`RessourceProgrammeCreateManyInput`…), donc non interchangeables : chaque
 * appelant fournit deux fermetures typées plutôt qu'un délégué transtypé. Aucun
 * `as` ne traverse cette frontière.
 */
export interface JonctionPort {
  /** Supprime tous les rattachements de l'entité. */
  purge(): Promise<unknown>
  /** Crée les rattachements (la clé étrangère est ajoutée par l'appelant). */
  creer(rows: RattachementRow[]): Promise<unknown>
}

export interface ReplaceProgrammesOptions {
  /** Programme à marquer principal. À défaut, le premier de la liste. */
  principalSlug?: string | null
}

/**
 * Garde de formulaire : refuse l'absence de rattachement.
 * Séparée de `replaceProgrammes` pour être appelable dans les server actions
 * avant d'ouvrir une transaction.
 */
export function assertAuMoinsUnProgramme(slugs: string[] | undefined | null): asserts slugs is string[] {
  if (!slugs || slugs.length === 0) throw new ProgrammeRequisError()
}

/**
 * Remplace l'intégralité des rattachements d'une entité (purge puis recréation).
 *
 * @param tx      client Prisma (ou transaction) — sert à résoudre les slugs
 * @param port    écriture vers la table de jonction de l'entité concernée
 * @param slugs   slugs des programmes — au moins un, doublons tolérés
 */
export async function replaceProgrammes(
  tx: ProgrammeLecteur,
  port: JonctionPort,
  slugs: string[],
  options: ReplaceProgrammesOptions = {},
): Promise<void> {
  assertAuMoinsUnProgramme(slugs)

  // Doublons écartés en préservant l'ordre : la PK composite les rejetterait, et
  // l'ordre porte le choix du principal par défaut.
  const demandes = [...new Set(slugs)]

  const trouves = await tx.programme.findMany({
    where: { slug: { in: demandes } },
    select: { id: true, slug: true },
  })
  const parSlug = new Map(trouves.map((p) => [p.slug, p.id]))

  const inconnus = demandes.filter((s) => !parSlug.has(s))
  if (inconnus.length > 0) throw new ProgrammeInconnuError(inconnus)

  // Un seul principal : le slug désigné s'il fait partie de la liste, sinon le premier.
  const principal =
    options.principalSlug && demandes.includes(options.principalSlug)
      ? options.principalSlug
      : demandes[0]

  await port.purge()
  await port.creer(
    demandes.map((slug) => ({
      programmeId: parSlug.get(slug) as string,
      principal: slug === principal,
    })),
  )
}

/**
 * Variante FACULTATIVE : une liste vide purge les rattachements au lieu d'échouer.
 *
 * Deux fonctions nommées plutôt qu'un booléen d'option : au point d'appel,
 * `replaceProgrammesOptionnels(...)` dit quel régime s'applique, là où un
 * `{ autoriserVide: true }` obligerait à revenir lire la signature. Le régime est
 * une décision métier (contenus = obligatoire, acteurs = facultatif), pas un détail.
 */
export async function replaceProgrammesOptionnels(
  tx: ProgrammeLecteur,
  port: JonctionPort,
  slugs: string[],
  options: ReplaceProgrammesOptions = {},
): Promise<void> {
  if (slugs.length === 0) {
    await port.purge()
    return
  }
  await replaceProgrammes(tx, port, slugs, options)
}

/** Extrait le slug du programme principal d'une liste de rattachements chargée. */
export function slugPrincipal(
  rattachements: { principal: boolean; programme: { slug: string } }[] | undefined | null,
): string | null {
  if (!rattachements || rattachements.length === 0) return null
  return (rattachements.find((r) => r.principal) ?? rattachements[0]).programme.slug
}
