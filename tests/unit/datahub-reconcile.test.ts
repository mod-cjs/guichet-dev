/**
 * M13 / Data Hub — réconciliation automatisée après chaque run (GUIC-697, lot 5).
 *
 * « Le pipeline n'a pas planté » et « le pipeline a tout extrait » sont deux choses
 * différentes (spec §8.4) : le mode opératoire demandait à un HUMAIN de comparer
 * `/api/v1/export/counts` aux `COUNT(*)` de l'entrepôt après chaque run. Une étape
 * manuelle documentée mais non outillée finit par ne plus être exécutée.
 *
 * `reconcile()` est la logique PURE — source et entrepôt sont injectés (comme
 * `FindManyDelegate` dans `keyset.test.ts`) : ces tests portent sur la comparaison et la
 * détection d'écart, pas sur Prisma ni sur un vrai PostgreSQL.
 */
import { reconcile, type CountSource, type WarehouseSource } from '@/lib/datahub/reconcile'
import { allDescriptors } from '@/lib/datahub/descriptor'

const DEPUIS = new Date('2026-08-01T00:00:00.000Z')

function sourceFixe(valeurs: Record<string, number>): CountSource {
  return { count: async (_model, _field, _since) => valeurs[_model] ?? 0 }
}

function entrepotFixe(valeurs: Record<string, number>): WarehouseSource {
  return { count: async (table, _column, _since) => valeurs[table] ?? 0 }
}

describe('reconcile', () => {
  it('ne signale aucun écart quand source et entrepôt concordent sur tous les flux', async () => {
    const descriptors = allDescriptors()
    const valeurs = Object.fromEntries(descriptors.map((d) => [d.model, 10]))
    const valeursTable = Object.fromEntries(descriptors.map((d) => [d.name, 10]))

    const rows = await reconcile(descriptors, DEPUIS, sourceFixe(valeurs), entrepotFixe(valeursTable))

    expect(rows).toHaveLength(descriptors.length)
    expect(rows.every((r) => r.ecart === 0)).toBe(true)
  })

  it('signale un écart quand l\'entrepôt a perdu des lignes — l\'exact scénario que ça sert à détecter', async () => {
    const descriptors = allDescriptors()
    const valeurs = Object.fromEntries(descriptors.map((d) => [d.model, 100]))
    const valeursTable = Object.fromEntries(descriptors.map((d) => [d.name, 100]))
    valeursTable.candidatures = 97 // 3 lignes perdues, silencieusement, sans cette réconciliation

    const rows = await reconcile(descriptors, DEPUIS, sourceFixe(valeurs), entrepotFixe(valeursTable))
    const candidatures = rows.find((r) => r.stream === 'candidatures')!

    expect(candidatures.ecart).toBe(3)
    expect(candidatures.source).toBe(100)
    expect(candidatures.entrepot).toBe(97)
  })

  it('interroge chaque flux sur SA colonne de réplication exportée, pas une colonne unique', async () => {
    const descriptors = allDescriptors()
    const colonnesInterrogees: string[] = []
    const entrepot: WarehouseSource = {
      count: async (table, column) => {
        colonnesInterrogees.push(`${table}.${column}`)
        return 1
      },
    }
    await reconcile(descriptors, DEPUIS, sourceFixe({}), entrepot)

    // Preuve directe : consultations exporte `created_at` (append-only), utilisateurs
    // `updated_at` — une réconciliation qui interrogerait `updated_at` partout comparerait
    // des fenêtres différentes de celles réellement filtrées côté source.
    expect(colonnesInterrogees).toContain('consultations.created_at')
    expect(colonnesInterrogees).toContain('utilisateurs.updated_at')
    expect(colonnesInterrogees).toContain('checkins.effectue_a')
  })

  it('applique la même borne `since` aux deux côtés de la comparaison', async () => {
    const descriptors = allDescriptors()
    const bornesSource: Date[] = []
    const bornesEntrepot: Date[] = []
    const source: CountSource = { count: async (_m, _f, since) => { bornesSource.push(since); return 1 } }
    const entrepot: WarehouseSource = { count: async (_t, _c, since) => { bornesEntrepot.push(since); return 1 } }

    await reconcile(descriptors, DEPUIS, source, entrepot)

    // `.every()` sur un tableau vide vaut `true` : vérifier la longueur évite qu'un stub
    // n'appelant jamais les deux côtés ne fasse passer ce test par vacuité.
    expect(bornesSource).toHaveLength(descriptors.length)
    expect(bornesEntrepot).toHaveLength(descriptors.length)
    expect(bornesSource.every((d) => d.getTime() === DEPUIS.getTime())).toBe(true)
    expect(bornesEntrepot.every((d) => d.getTime() === DEPUIS.getTime())).toBe(true)
  })

  it('un flux dont la comparaison échoue (erreur réseau) est signalé, pas silencieusement omis', async () => {
    const descriptors = allDescriptors()
    const source = sourceFixe(Object.fromEntries(descriptors.map((d) => [d.model, 1])))
    const entrepot: WarehouseSource = {
      count: async (table, column, since) => {
        if (table === 'consultations') throw new Error('connexion PostgreSQL refusée')
        return 1
      },
    }

    const rows = await reconcile(descriptors, DEPUIS, source, entrepot)
    const consultations = rows.find((r) => r.stream === 'consultations')!

    expect(consultations.erreur).toMatch(/PostgreSQL/)
    expect(consultations.ecart).toBeNull()
  })
})
