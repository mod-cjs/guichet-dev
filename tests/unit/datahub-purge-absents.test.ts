/**
 * M13 / Data Hub — propagation des suppressions dures (GUIC-700, lot 7, R6).
 *
 * `Utilisateur` n'est jamais hard-deleted (soft-delete + anonymisation SSO, déjà propagé
 * par `softDelete: 'deletedAt'`). Mais `Emprunt`, `Centre`, `Evenement` et `Ressource` le
 * sont réellement (admin, ou `deleteMany` à l'anonymisation) — SANS `softDelete` déclaré :
 * la ligne disparaît de MariaDB sans laisser de trace, et l'entrepôt accumule un fantôme.
 *
 * Arbitrage tranché (2026-08-03) : une clé présente dans l'entrepôt mais absente d'une
 * liste FRAÎCHE et COMPLÈTE des clés source est supprimée PHYSIQUEMENT — pas de
 * tombstone, un `cjs_uid` resté en base après une demande d'effacement serait un risque
 * CDP réel.
 *
 * Logique PURE, injection de dépendances comme `reconcile.ts` : testable sans Prisma ni
 * PostgreSQL réels.
 */
import { purgeAbsents, type KeySource, type WarehouseKeys } from '@/lib/datahub/purge-absents'
import { allDescriptors } from '@/lib/datahub/descriptor'

function sourceFixe(valeurs: Record<string, string[]>): KeySource {
  return { keys: async (model) => valeurs[model] ?? [] }
}

function entrepotFixe(cles: Record<string, string[]>, suppressions: Record<string, string[]>): WarehouseKeys {
  return {
    keys: async (table) => cles[table] ?? [],
    deleteMany: async (table, _column, absentes) => {
      suppressions[table] = absentes
      return absentes.length
    },
  }
}

describe('purgeAbsents', () => {
  it('ne supprime rien quand toutes les clés de l\'entrepôt existent encore côté source', async () => {
    const descriptors = allDescriptors()
    const source = Object.fromEntries(descriptors.map((d) => [d.model, ['a', 'b', 'c']]))
    const entrepot = Object.fromEntries(descriptors.map((d) => [d.name, ['a', 'b', 'c']]))
    const suppressions: Record<string, string[]> = {}

    const rows = await purgeAbsents(descriptors, sourceFixe(source), entrepotFixe(entrepot, suppressions))

    expect(rows.every((r) => r.supprimees === 0)).toBe(true)
    expect(Object.keys(suppressions)).toHaveLength(0)
  })

  it('supprime physiquement une clé disparue côté source — le scénario Emprunt réel', async () => {
    const descriptors = allDescriptors()
    const source = Object.fromEntries(descriptors.map((d) => [d.model, ['a', 'b']]))
    // `emprunt-3` a été hard-deleted à l'anonymisation : il n'apparaît plus côté source,
    // mais reste dans l'entrepôt tant que rien ne l'y supprime.
    const entrepot = Object.fromEntries(descriptors.map((d) => [d.name, ['a', 'b']]))
    entrepot.emprunts = ['a', 'b', 'emprunt-3']
    const suppressions: Record<string, string[]> = {}

    const rows = await purgeAbsents(descriptors, sourceFixe(source), entrepotFixe(entrepot, suppressions))
    const emprunts = rows.find((r) => r.stream === 'emprunts')!

    expect(emprunts.supprimees).toBe(1)
    expect(suppressions.emprunts).toEqual(['emprunt-3'])
  })

  it('ne supprime jamais une ligne soft-deleted — elle reste listée par la source', async () => {
    // `utilisateurs` porte un softDelete : un compte anonymisé garde `deletedAt` posé mais
    // sa clé primaire reste dans un listage complet Prisma. Aucune distinction nécessaire
    // dans purgeAbsents — la clé est toujours là, donc jamais candidate à la suppression.
    const descriptors = allDescriptors()
    const source = Object.fromEntries(descriptors.map((d) => [d.model, ['u1', 'u2-anonymise']]))
    const entrepot = Object.fromEntries(descriptors.map((d) => [d.name, ['u1', 'u2-anonymise']]))
    const suppressions: Record<string, string[]> = {}

    const rows = await purgeAbsents(descriptors, sourceFixe(source), entrepotFixe(entrepot, suppressions))
    const utilisateurs = rows.find((r) => r.stream === 'utilisateurs')!

    expect(utilisateurs.supprimees).toBe(0)
    expect(suppressions.utilisateurs).toBeUndefined()
  })

  it('un flux dont la comparaison échoue est signalé, jamais omis silencieusement', async () => {
    const descriptors = allDescriptors()
    const source: KeySource = {
      keys: async (model) => {
        if (model === 'Consultation') throw new Error('connexion PostgreSQL refusée')
        return []
      },
    }
    const entrepot = entrepotFixe({}, {})

    const rows = await purgeAbsents(descriptors, source, entrepot)
    const consultations = rows.find((r) => r.stream === 'consultations')!

    expect(consultations.erreur).toMatch(/PostgreSQL/)
    expect(consultations.supprimees).toBeNull()
  })

  it('interroge l\'entrepôt sur le nom EXPORTÉ de la clé primaire, pas le nom Prisma', async () => {
    // cjsUid (Prisma) devient cjs_uid dans l'entrepôt (GUIC-697 D1 : même piège). Interroger
    // l'entrepôt sur le nom Prisma viserait une colonne qui n'y existe pas.
    const descriptors = allDescriptors()
    const colonnesInterrogees: string[] = []
    const entrepot: WarehouseKeys = {
      keys: async (table, column) => { colonnesInterrogees.push(`${table}.${column}`); return [] },
      deleteMany: async () => 0,
    }
    await purgeAbsents(descriptors, sourceFixe({}), entrepot)

    expect(colonnesInterrogees).toContain('utilisateurs.cjs_uid')
    expect(colonnesInterrogees).not.toContain('utilisateurs.cjsUid')
  })

  it('n\'appelle deleteMany que pour les flux avec au moins une absence', async () => {
    const descriptors = allDescriptors()
    const source = Object.fromEntries(descriptors.map((d) => [d.model, ['x']]))
    const entrepot = Object.fromEntries(descriptors.map((d) => [d.name, ['x']]))
    let appelsDelete = 0
    const entrepotSource: WarehouseKeys = {
      keys: async (table) => entrepot[table] ?? [],
      deleteMany: async () => { appelsDelete++; return 0 },
    }

    await purgeAbsents(descriptors, sourceFixe(source), entrepotSource)
    expect(appelsDelete).toBe(0)
  })
})
