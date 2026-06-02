/**
 * @jest-environment node
 *
 * Tests pour scripts/migrate-drupal-users.ts (GUIC-200).
 * Couvre :
 *  - succès simple (1 user migré)
 *  - email dupliqué dans le batch (skip 2e)
 *  - téléphone invalide (devient NULL, user créé)
 *  - rôle exclu (employeur → skip)
 *  - email NULL (skip)
 *
 * Prisma et MySQL sont stubés via objets simples — pas de DB réelle.
 */

import {
  buildUtilisateurPayload,
  migrateUsers,
  normalizePhone,
  mapGenre,
  splitNomPrenom,
  isExcludedByRole,
  type DrupalUserRow,
} from '../../scripts/migrate-drupal-users'

// ─── Tests unitaires helpers ──────────────────────────────────────────────

describe('helpers', () => {
  describe('normalizePhone', () => {
    it('passe un E.164 valide', () => {
      expect(normalizePhone('+221771234567')).toBe('+221771234567')
    })
    it('préfixe 9 chiffres locaux avec +221', () => {
      expect(normalizePhone('771234567')).toBe('+221771234567')
    })
    it('gère un format avec espaces', () => {
      expect(normalizePhone('+221 77 123 45 67')).toBe('+221771234567')
    })
    it('retourne null pour invalide', () => {
      expect(normalizePhone('xyz')).toBeNull()
      expect(normalizePhone('')).toBeNull()
      expect(normalizePhone(null)).toBeNull()
    })
  })

  describe('mapGenre', () => {
    it('map homme/femme vers M/F', () => {
      expect(mapGenre('homme')).toBe('M')
      expect(mapGenre('Femme')).toBe('F')
    })
    it('retourne null si inconnu', () => {
      expect(mapGenre('autre')).toBeNull()
      expect(mapGenre(null)).toBeNull()
    })
  })

  describe('splitNomPrenom', () => {
    it('garde tel quel si les deux sont remplis', () => {
      expect(splitNomPrenom('NDIAYE', 'Fatou')).toEqual({ nom: 'NDIAYE', prenom: 'Fatou' })
    })
    it('split le nom en deux quand prenom vide', () => {
      expect(splitNomPrenom('Seydou CISSE', null)).toEqual({ nom: 'CISSE', prenom: 'Seydou' })
    })
    it('fallback Inconnu si tout vide', () => {
      expect(splitNomPrenom(null, null)).toEqual({ nom: 'Inconnu', prenom: '' })
    })
  })

  describe('isExcludedByRole', () => {
    it('exclut administrator', () => {
      expect(isExcludedByRole('invite,administrator')).toBe(true)
    })
    it('exclut employeur', () => {
      expect(isExcludedByRole('employeur')).toBe(true)
    })
    it('garde un simple invite', () => {
      expect(isExcludedByRole('invite')).toBe(false)
    })
    it('garde si rôles vides', () => {
      expect(isExcludedByRole(null)).toBe(false)
    })
  })
})

// ─── Tests buildUtilisateurPayload ────────────────────────────────────────

function makeRow(overrides: Partial<DrupalUserRow> = {}): DrupalUserRow {
  return {
    uid: 100,
    mail: 'jeune@example.com',
    status: 1,
    created: 1700000000,
    nom: 'NDIAYE',
    prenom: 'Fatou',
    sexe: 'femme',
    telephone: '+221771234567',
    date_naissance: '2000-05-15',
    roles: 'invite',
    ...overrides,
  } as unknown as DrupalUserRow
}

describe('buildUtilisateurPayload', () => {
  it('cas succès — produit un payload Prisma complet', () => {
    const out = buildUtilisateurPayload(makeRow())
    expect('skip' in out).toBe(false)
    if ('data' in out) {
      expect(out.data.drupalUid).toBe(100)
      expect(out.data.email).toBe('jeune@example.com')
      expect(out.data.nom).toBe('NDIAYE')
      expect(out.data.prenom).toBe('Fatou')
      expect(out.data.genre).toBe('F')
      expect(out.data.telephone).toBe('+221771234567')
      expect(out.data.statut).toBe('actif')
      expect(out.data.onboardingComplete).toBe(false)
      expect(out.data.cjsUid).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it('téléphone invalide → null (user quand même créé)', () => {
    const out = buildUtilisateurPayload(makeRow({ telephone: 'pas-un-numero' }))
    if ('data' in out) {
      expect(out.data.telephone).toBeNull()
      expect(out.data.drupalUid).toBe(100)
    } else {
      throw new Error('attendu un payload, pas un skip')
    }
  })

  it('rôle exclu (employeur) → skip', () => {
    const out = buildUtilisateurPayload(makeRow({ roles: 'invite,employeur' }))
    expect(out).toEqual({ skip: 'role' })
  })

  it('email vide → skip no_email', () => {
    const out = buildUtilisateurPayload(makeRow({ mail: '' }))
    expect(out).toEqual({ skip: 'no_email' })
  })

  it('email NULL → skip no_email', () => {
    const out = buildUtilisateurPayload(makeRow({ mail: null }))
    expect(out).toEqual({ skip: 'no_email' })
  })

  it('email normalisé en lowercase', () => {
    const out = buildUtilisateurPayload(makeRow({ mail: 'TOTO@EXAMPLE.COM' }))
    if ('data' in out) {
      expect(out.data.email).toBe('toto@example.com')
    }
  })
})

// ─── Test d'intégration migrateUsers ──────────────────────────────────────

describe('migrateUsers (orchestration)', () => {
  /**
   * Mock connexion mysql + Prisma — on contrôle les rows renvoyées et on
   * vérifie les compteurs finaux.
   */
  function makeDrupal(rows: DrupalUserRow[]) {
    return {
      query: jest.fn().mockResolvedValue([rows, []]),
    } as unknown as import('mysql2/promise').Connection
  }

  function makePrisma(existing: Array<{ drupalUid: number | null; email: string | null; telephone: string | null }> = []) {
    const created: any[] = []
    return {
      created,
      prisma: {
        utilisateur: {
          findMany: jest.fn().mockResolvedValue(existing),
          createMany: jest.fn().mockImplementation(async ({ data }: { data: any[] }) => {
            created.push(...data)
            return { count: data.length }
          }),
          create: jest.fn().mockImplementation(async ({ data }: { data: any }) => {
            created.push(data)
            return data
          }),
        },
      } as unknown as import('@prisma/client').PrismaClient,
    }
  }

  it('5 cas combinés — succès / dup-email / téléphone invalide / rôle exclu / email NULL', async () => {
    const rows: DrupalUserRow[] = [
      makeRow({ uid: 1, mail: 'a@x.com', telephone: '+221770000001' }),     // ok
      makeRow({ uid: 2, mail: 'A@X.COM', telephone: '+221770000002' }),     // dup email (lowercase)
      makeRow({ uid: 3, mail: 'b@x.com', telephone: 'xxx' }),                // tel invalide → null, OK
      makeRow({ uid: 4, mail: 'c@x.com', roles: 'invite,employeur' }),       // rôle exclu
      makeRow({ uid: 5, mail: null }),                                       // no_email
    ]
    const drupal = makeDrupal(rows)
    const { prisma, created } = makePrisma()

    const stats = await migrateUsers(drupal, prisma, { dryRun: false, batchSize: 1000 })

    expect(stats.total).toBe(5)
    expect(stats.migrated).toBe(2)
    expect(stats.skippedEmailDup).toBe(1)
    expect(stats.skippedRole).toBe(1)
    expect(stats.skippedNoEmail).toBe(1)
    expect(stats.errors).toBe(0)

    expect(created).toHaveLength(2)
    expect(created[0].email).toBe('a@x.com')
    expect(created[1].email).toBe('b@x.com')
    expect(created[1].telephone).toBeNull()
  })

  it('idempotence — user déjà présent par drupal_uid est compté en alreadyExists', async () => {
    const rows: DrupalUserRow[] = [makeRow({ uid: 42, mail: 'rerun@x.com' })]
    const drupal = makeDrupal(rows)
    const { prisma } = makePrisma([{ drupalUid: 42, email: 'rerun@x.com', telephone: null }])

    const stats = await migrateUsers(drupal, prisma, { dryRun: false, batchSize: 1000 })

    expect(stats.total).toBe(1)
    expect(stats.migrated).toBe(0)
    expect(stats.alreadyExists).toBe(1)
  })

  it('DRY RUN n\'écrit rien mais compte', async () => {
    const rows: DrupalUserRow[] = [
      makeRow({ uid: 10, mail: 'dr@x.com' }),
      makeRow({ uid: 11, mail: 'dr2@x.com' }),
    ]
    const drupal = makeDrupal(rows)
    const { prisma, created } = makePrisma()

    const stats = await migrateUsers(drupal, prisma, { dryRun: true, batchSize: 1000 })

    expect(stats.migrated).toBe(2)
    expect(created).toHaveLength(0) // aucune écriture
  })

  it('téléphone dupliqué entre 2 users → 2e mis à NULL', async () => {
    const rows: DrupalUserRow[] = [
      makeRow({ uid: 1, mail: 'a@x.com', telephone: '+221770000099' }),
      makeRow({ uid: 2, mail: 'b@x.com', telephone: '+221770000099' }), // même phone
    ]
    const drupal = makeDrupal(rows)
    const { prisma, created } = makePrisma()

    const stats = await migrateUsers(drupal, prisma, { dryRun: false, batchSize: 1000 })

    expect(stats.migrated).toBe(2)
    expect(stats.skippedPhoneDup).toBe(1)
    expect(created[0].telephone).toBe('+221770000099')
    expect(created[1].telephone).toBeNull()
  })
})
