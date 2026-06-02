/**
 * @jest-environment node
 *
 * GUIC-185 — Tests intégration du script de migration data (M3 v2 — 178d/4).
 *
 * Prisma est mocké via une fausse implémentation en mémoire qui rejoue les
 * opérations findUnique/findMany/findFirst/update/create/count utilisées
 * par `scripts/migrate-opportunites-to-polymorphic.ts`.
 *
 * Couverture :
 *  - Backfill `typeId` + `organisationLibelle` à partir des colonnes legacy.
 *  - Création des sous-types 1:1 par défaut prudent selon le mapping §4.3.
 *  - Cas Volontariat → APPEL_A_PROJETS + flag review.
 *  - Idempotence : 2e run ne crée aucun sous-type supplémentaire.
 *  - Volontariat count strategy (manual <50 / auto >=50).
 */

// ─── Faux client Prisma en mémoire ───────────────────────────────────────────

type Row = Record<string, unknown>

interface MemoryStore {
  opportuniteType: Row[]
  organisation: Row[]
  opportunite: Row[]
  opportuniteEmploi: Row[]
  opportuniteStage: Row[]
  opportuniteFormation: Row[]
  opportuniteBourse: Row[]
  opportuniteConcours: Row[]
  opportuniteAppelAProjets: Row[]
  opportuniteVolontariat: Row[]
}

type MemoryClient = {
  opportuniteType: { findMany: jest.Mock }
  organisation: { findFirst: jest.Mock }
  opportunite: { count: jest.Mock; findMany: jest.Mock; update: jest.Mock }
  opportuniteEmploi: { findUnique: jest.Mock; create: jest.Mock }
  opportuniteStage: { findUnique: jest.Mock; create: jest.Mock }
  opportuniteFormation: { findUnique: jest.Mock; create: jest.Mock }
  opportuniteBourse: { findUnique: jest.Mock; create: jest.Mock }
  opportuniteConcours: { findUnique: jest.Mock; create: jest.Mock }
  opportuniteAppelAProjets: { findUnique: jest.Mock; create: jest.Mock }
  opportuniteVolontariat: { findUnique: jest.Mock; create: jest.Mock }
  $transaction: jest.Mock
}

function makeMemoryClient(store: MemoryStore): MemoryClient {
  const subtypeStores: Record<string, Row[]> = {
    opportuniteEmploi: store.opportuniteEmploi,
    opportuniteStage: store.opportuniteStage,
    opportuniteFormation: store.opportuniteFormation,
    opportuniteBourse: store.opportuniteBourse,
    opportuniteConcours: store.opportuniteConcours,
    opportuniteAppelAProjets: store.opportuniteAppelAProjets,
    opportuniteVolontariat: store.opportuniteVolontariat,
  }

  function makeSubtypeModel(name: string): {
    findUnique: jest.Mock
    create: jest.Mock
  } {
    const data = subtypeStores[name]
    return {
      findUnique: jest.fn(async ({ where }: { where: { opportuniteId: string } }) => {
        return data.find((r) => r.opportuniteId === where.opportuniteId) ?? null
      }),
      create: jest.fn(async ({ data: row }: { data: Row }) => {
        data.push({ ...row })
        return row
      }),
    }
  }

  const client: MemoryClient = {
    opportuniteType: {
      findMany: jest.fn(async () => store.opportuniteType.map((r) => ({ ...r }))),
    },
    organisation: {
      findFirst: jest.fn(async ({ where }: { where: { nom: string } }) => {
        const o = store.organisation.find((r) => r.nom === where.nom)
        return o ? { id: o.id } : null
      }),
    },
    opportunite: {
      count: jest.fn(async ({ where }: { where: { type: { in: string[] } } }) => {
        return store.opportunite.filter((o) =>
          where.type.in.includes(o.type as string),
        ).length
      }),
      findMany: jest.fn(
        async ({
          take,
          cursor,
          skip,
        }: {
          take: number
          cursor?: { id: string }
          skip?: number
        }) => {
          let list = [...store.opportunite].sort((a, b) =>
            (a.id as string).localeCompare(b.id as string),
          )
          if (cursor) {
            const idx = list.findIndex((r) => r.id === cursor.id)
            if (idx >= 0) list = list.slice(idx + (skip ?? 0))
          }
          return list.slice(0, take).map((r) => ({ ...r }))
        },
      ),
      update: jest.fn(
        async ({ where, data }: { where: { id: string }; data: Row }) => {
          const row = store.opportunite.find((r) => r.id === where.id)
          if (!row) throw new Error(`opportunite ${where.id} introuvable`)
          Object.assign(row, data)
          return row
        },
      ),
    },
    opportuniteEmploi: makeSubtypeModel('opportuniteEmploi'),
    opportuniteStage: makeSubtypeModel('opportuniteStage'),
    opportuniteFormation: makeSubtypeModel('opportuniteFormation'),
    opportuniteBourse: makeSubtypeModel('opportuniteBourse'),
    opportuniteConcours: makeSubtypeModel('opportuniteConcours'),
    opportuniteAppelAProjets: makeSubtypeModel('opportuniteAppelAProjets'),
    opportuniteVolontariat: makeSubtypeModel('opportuniteVolontariat'),
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(client)),
  }

  return client
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function freshStore(): MemoryStore {
  return {
    opportuniteType: [
      { id: 'type-emploi', slug: 'emploi' },
      { id: 'type-stage', slug: 'stage' },
      { id: 'type-formation', slug: 'formation' },
      { id: 'type-bourse', slug: 'bourse' },
      { id: 'type-concours', slug: 'concours' },
      { id: 'type-appel_a_projets', slug: 'appel_a_projets' },
      // Post-audit §19 : 4 sous-types ajoutés (financement, mentorat, mobilite, volontariat)
      { id: 'type-financement', slug: 'financement' },
      { id: 'type-mentorat', slug: 'mentorat' },
      { id: 'type-mobilite', slug: 'mobilite' },
      { id: 'type-volontariat', slug: 'volontariat' },
    ],
    organisation: [{ id: 'org-cjs', nom: 'CJS' }],
    opportunite: [
      mkOpp('o1', 'Emploi', 'CJS'),
      mkOpp('o2', 'Stage', 'Acme'),
      mkOpp('o3', 'Formation', 'CJS'),
      mkOpp('o4', 'Bourse', 'AUF'),
      mkOpp('o5', 'Appel_a_projets', 'BAD'),
      mkOpp('o6', 'Volontariat', 'Croix-Rouge'),
      mkOpp('o7', 'Volontariat', 'Volunteer Org'),
      mkOpp('o8', 'Emploi', 'CJS'), // doublon organisation pour test resolve
    ],
    opportuniteEmploi: [],
    opportuniteStage: [],
    opportuniteFormation: [],
    opportuniteBourse: [],
    opportuniteConcours: [],
    opportuniteAppelAProjets: [],
    opportuniteVolontariat: [],
  }
}

function mkOpp(id: string, type: string, organisation: string): Row {
  return {
    id,
    type,
    organisation,
    organisationId: null,
    organisationLibelle: null,
    typeId: null,
  }
}

// ─── Import du script (sans déclencher main) ────────────────────────────────

// On stub require.main = undefined côté script via require.cache : il suffit
// de définir DATABASE_URL avant l'import pour ne pas crasher, et `require.main`
// ne sera pas le module testé.
process.env.DATABASE_URL = 'mysql://stub:stub@localhost:3306/stub'

import { migrateOpportunites, countVolontariatLegacy } from '../../scripts/migrate-opportunites-to-polymorphic'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('migrate-opportunites-to-polymorphic — GUIC-185', () => {
  it('Étape A — count Volontariat legacy correspond au nombre réel', async () => {
    const store = freshStore()
    const client = makeMemoryClient(store)
    const count = await countVolontariatLegacy(client as never)
    expect(count).toBe(2)
  })

  it('Étapes B+C+D — backfill complet + création sous-types par mapping §4.3', async () => {
    const store = freshStore()
    const client = makeMemoryClient(store)

    const report = await migrateOpportunites(client as never)

    expect(report.totalOpportunites).toBe(8)
    expect(report.subtypesCreated).toEqual({
      emploi: 2,
      stage: 1,
      formation: 1,
      bourse: 1,
      appel_a_projets: 1, // les Volontariat ont leur propre sous-type maintenant
      volontariat: 2, // o6 et o7 — sous-type dédié (post-audit spec §19)
    })

    // typeId backfillé sur toutes
    const oppEmploi = store.opportunite.find((o) => o.id === 'o1')!
    expect(oppEmploi.typeId).toBe('type-emploi')
    const oppVolontariat = store.opportunite.find((o) => o.id === 'o6')!
    expect(oppVolontariat.typeId).toBe('type-volontariat')

    // organisationLibelle copié depuis organisation legacy
    expect(store.opportunite.every((o) => o.organisationLibelle !== null)).toBe(true)

    // organisationId résolu best-effort pour 'CJS' (3 lignes pointent vers org-cjs)
    expect(report.organisationIdResolved).toBe(3)
    const oppCjs = store.opportunite.find((o) => o.id === 'o1')!
    expect(oppCjs.organisationId).toBe('org-cjs')

    // Valeurs par défaut sous-types
    expect(store.opportuniteEmploi[0]).toMatchObject({ typeContrat: 'CDD' })
    expect(store.opportuniteStage[0]).toMatchObject({ dureeMois: 6, indemnise: false })
    expect(store.opportuniteFormation[0]).toMatchObject({
      dureeHeures: 0,
      modalite: 'PRESENTIEL',
    })
    expect(store.opportuniteBourse[0]).toMatchObject({
      montantTotalFcfa: 0,
      organismeFinanceur: 'À renseigner',
    })
    expect(store.opportuniteAppelAProjets[0]).toMatchObject({
      dossierRequis: 'À renseigner',
      criteresEligibilite: 'À renseigner',
    })
  })

  it('Volontariat legacy → sous-type volontariat dédié (post-audit §19, override §18 Q5)', async () => {
    const store = freshStore()
    const client = makeMemoryClient(store)

    const report = await migrateOpportunites(client as never)

    expect(report.volontariatCount).toBe(2)
    expect(report.volontariatStrategy).toBe('manual') // < 50
    // Plus de flag review puisque le sous-type dédié existe
    // (flaggedReview ne concerne plus que les 'AUTRE' legacy)

    // Les opps Volontariat ont bien le typeId du sous-type dédié
    const o6 = store.opportunite.find((o) => o.id === 'o6')!
    const o7 = store.opportunite.find((o) => o.id === 'o7')!
    expect(o6.typeId).toBe('type-volontariat')
    expect(o7.typeId).toBe('type-volontariat')

    // Et le sous-type volontariat a bien été créé pour eux avec valeurs par défaut
    const v6 = store.opportuniteVolontariat.find((r) => r.opportuniteId === 'o6')
    expect(v6).toMatchObject({
      opportuniteId: 'o6',
      dureeMois: 6,
      typeVolontariat: 'ENGAGEMENT',
    })
    expect(store.opportuniteVolontariat.find((r) => r.opportuniteId === 'o7')).toBeTruthy()
  })

  it('Q5 — stratégie auto si >= 50 Volontariat legacy', async () => {
    const store = freshStore()
    // Empile 50 Volontariat supplémentaires
    for (let i = 0; i < 50; i++) {
      store.opportunite.push(mkOpp(`v${i.toString().padStart(3, '0')}`, 'Volontariat', 'Org'))
    }
    const client = makeMemoryClient(store)

    const report = await migrateOpportunites(client as never)

    expect(report.volontariatCount).toBeGreaterThanOrEqual(50)
    expect(report.volontariatStrategy).toBe('auto')
  })

  it('Étape E — idempotence : 2e exécution ne duplique aucun sous-type', async () => {
    const store = freshStore()
    const client = makeMemoryClient(store)

    const r1 = await migrateOpportunites(client as never)
    const subtypesAfterFirst = {
      emploi: store.opportuniteEmploi.length,
      stage: store.opportuniteStage.length,
      formation: store.opportuniteFormation.length,
      bourse: store.opportuniteBourse.length,
      appelAProjets: store.opportuniteAppelAProjets.length,
    }

    const r2 = await migrateOpportunites(client as never)

    expect(r2.totalOpportunites).toBe(r1.totalOpportunites)
    expect(r2.alreadyMigrated).toBe(8) // tous déjà migrés au 2e run
    // Aucun nouvel insert sous-type
    expect(store.opportuniteEmploi.length).toBe(subtypesAfterFirst.emploi)
    expect(store.opportuniteStage.length).toBe(subtypesAfterFirst.stage)
    expect(store.opportuniteFormation.length).toBe(subtypesAfterFirst.formation)
    expect(store.opportuniteBourse.length).toBe(subtypesAfterFirst.bourse)
    expect(store.opportuniteAppelAProjets.length).toBe(subtypesAfterFirst.appelAProjets)
  })

  it('échoue avec un message explicite si seed OpportuniteType incomplet', async () => {
    const store = freshStore()
    store.opportuniteType = store.opportuniteType.filter((t) => t.slug !== 'appel_a_projets')
    const client = makeMemoryClient(store)

    await expect(migrateOpportunites(client as never)).rejects.toThrow(
      /OpportuniteType slug "appel_a_projets" introuvable/,
    )
  })
})
