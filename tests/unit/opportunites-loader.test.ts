/**
 * @jest-environment node
 *
 * Tests unitaires du loader du catalogue d'opportunités (GUIC-20).
 * La liste passe par `$queryRaw` (BOOLEAN MODE + NULLS LAST) ; Prisma et Redis
 * sont mockés. On inspecte le SQL généré (`.sql`) et ses paramètres (`.values`).
 */

const mockQueryRaw = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: (...a: unknown[]) => mockQueryRaw(...a) },
}))

const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockRedisGet(...a),
    set: (...a: unknown[]) => mockRedisSet(...a),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { listOpportunites, PAGE_SIZE } from '@/lib/opportunites-loader'
import type { OpportuniteFiltres } from '@/types/opportunite'

const ROW = {
  id: 'o1',
  slug: 'stage-agriculture',
  titre: 'Stage en agriculture',
  type: 'Stage',
  domaine: 'Agriculture',
  region: 'Dakar',
  organisation: 'CJS',
  remuneration: null,
  deadline: new Date('2026-12-01T00:00:00.000Z'),
}

const base: OpportuniteFiltres = { page: 1, sortBy: 'recent' }

/** Sql de la requête de lignes (1er appel $queryRaw). */
const rowsSql = () => mockQueryRaw.mock.calls[0][0] as { sql: string; values: unknown[] }

beforeEach(() => {
  jest.clearAllMocks()
  mockRedisGet.mockResolvedValue(null)
  mockRedisSet.mockResolvedValue('OK')
  // Renvoie le COUNT ou les lignes selon la requête.
  mockQueryRaw.mockImplementation((sql: { sql: string }) =>
    sql.sql.includes('COUNT(')
      ? Promise.resolve([{ total: BigInt(1) }])
      : Promise.resolve([ROW]),
  )
})

describe('listOpportunites — filtrage et visibilité', () => {
  it('ne renvoie que les opportunités publiées, non supprimées, non expirées', async () => {
    await listOpportunites(base)
    const { sql } = rowsSql()
    expect(sql).toContain("statut = 'publiee'")
    expect(sql).toContain('deleted_at IS NULL')
    expect(sql).toContain('deadline IS NULL OR deadline >= NOW()')
  })

  it('transmet les filtres domaine, type et région en paramètres', async () => {
    await listOpportunites({ ...base, domaine: 'Numerique', type: 'Emploi', region: 'Thies' })
    const { sql, values } = rowsSql()
    expect(sql).toContain('domaine = ?')
    expect(sql).toContain('type = ?')
    expect(sql).toContain('region = ?')
    expect(values).toEqual(expect.arrayContaining(['Numerique', 'Emploi', 'Thies']))
  })

  it('n’ajoute pas de filtre quand domaine/type/région sont absents', async () => {
    await listOpportunites(base)
    const { sql } = rowsSql()
    expect(sql).not.toContain('domaine = ?')
    expect(sql).not.toContain('type = ?')
    expect(sql).not.toContain('region = ?')
  })
})

describe('listOpportunites — tri et pagination', () => {
  it('trie par date de création décroissante en mode "recent"', async () => {
    await listOpportunites({ ...base, sortBy: 'recent' })
    expect(rowsSql().sql).toContain('created_at DESC')
  })

  it('trie par échéance avec les opportunités sans échéance en dernier (NULLS LAST)', async () => {
    await listOpportunites({ ...base, sortBy: 'deadline' })
    expect(rowsSql().sql).toContain('deadline IS NULL, deadline ASC')
  })

  it('pagine en offset (page 3 → offset 40, limit 20)', async () => {
    await listOpportunites({ ...base, page: 3 })
    expect(rowsSql().values).toEqual(expect.arrayContaining([PAGE_SIZE, (3 - 1) * PAGE_SIZE]))
  })

  it('ne renvoie que les champs carte', async () => {
    const res = await listOpportunites(base)
    expect(res.items[0]).toEqual({
      id: 'o1',
      slug: 'stage-agriculture',
      titre: 'Stage en agriculture',
      type: 'Stage',
      domaine: 'Agriculture',
      region: 'Dakar',
      organisation: 'CJS',
      remuneration: null,
      deadline: '2026-12-01T00:00:00.000Z',
    })
    expect(res.total).toBe(1)
    expect(res.pageSize).toBe(PAGE_SIZE)
  })
})

describe('listOpportunites — recherche', () => {
  it('utilise l’index plein-texte BOOLEAN MODE pour un mot ≥ 4 caractères', async () => {
    await listOpportunites({ ...base, q: 'agriculture' })
    const { sql, values } = rowsSql()
    expect(sql).toContain('MATCH(titre, description) AGAINST')
    expect(sql).toContain('IN BOOLEAN MODE')
    expect(values).toContain('agriculture')
  })

  it('retombe sur LIKE pour un terme court (< 4 caractères, ignoré par l’index)', async () => {
    await listOpportunites({ ...base, q: 'ong' })
    const { sql, values } = rowsSql()
    expect(sql).toContain('LIKE')
    expect(sql).not.toContain('MATCH')
    expect(values).toContain('%ong%')
  })

  it('ignore une recherche vide ou faite uniquement d’espaces', async () => {
    await listOpportunites({ ...base, q: '   ' })
    const { sql } = rowsSql()
    expect(sql).not.toContain('MATCH')
    expect(sql).not.toContain('LIKE')
  })
})

// GUIC-684 — filtre par programme : le rattachement vit dans une table de jonction,
// donc EXISTS(...) et non une colonne. Le COUNT doit porter le MÊME filtre que la
// liste, sinon la pagination annonce plus de résultats qu'elle n'en sert.
describe('listOpportunites — filtre programme', () => {
  it('ajoute une clause EXISTS sur la jonction, paramétrée', async () => {
    await listOpportunites({ ...base, programme: 'yeah' })
    const { sql, values } = rowsSql()
    expect(sql).toMatch(/EXISTS\s*\(/i)
    expect(sql).toContain('opportunites_programmes')
    expect(values).toContain('yeah')
  })

  it('accepte plusieurs programmes (multi-select)', async () => {
    await listOpportunites({ ...base, programme: ['yeah', 'edupop'] })
    const { sql, values } = rowsSql()
    expect(sql).toMatch(/IN\s*\(/i)
    expect(values).toEqual(expect.arrayContaining(['edupop', 'yeah']))
  })

  it('applique le MÊME filtre au COUNT qu’à la liste', async () => {
    await listOpportunites({ ...base, programme: 'yeah' })
    const countSql = (mockQueryRaw.mock.calls[1][0] as { sql: string }).sql
    expect(countSql).toContain('opportunites_programmes')
  })

  it('n’ajoute aucune clause quand le filtre est absent', async () => {
    await listOpportunites(base)
    expect(rowsSql().sql).not.toContain('opportunites_programmes')
  })
})

// GUIC-689 — filtre rémunération : `remuneration` est un texte libre en base (pas de
// booléen). Règle métier tranchée par le lead, implémentée dans `nonRemunereeSql()`
// (opportunites-loader.ts) : seuls NULL/vide/marqueurs explicites ("non rémunéré",
// "bénévole", "aucune", "sans rémunération") comptent comme non rémunérés — tout le
// reste (indemnités, bourses, salaires négociables) compte comme rémunéré, même sans
// montant chiffré.
describe('listOpportunites — filtre rémunération (règle métier GUIC-689)', () => {
  it('remuneration=no : exclut NULL, vide et tous les marqueurs explicites', async () => {
    await listOpportunites({ ...base, remuneration: 'no' })
    const { sql, values } = rowsSql()
    expect(sql).toContain('remuneration IS NULL')
    expect(sql).toContain("TRIM(remuneration) = ''")
    expect(sql).toContain('remuneration LIKE ?')
    expect(values).toEqual(
      expect.arrayContaining([
        '%non remunere%',
        '%benevole%',
        '%aucune%',
        '%sans remuneration%',
      ]),
    )
  })

  it('remuneration=yes : inverse strictement la même clause (NOT (...))', async () => {
    await listOpportunites({ ...base, remuneration: 'yes' })
    const { sql } = rowsSql()
    expect(sql).toMatch(/NOT\s*\(remuneration IS NULL/i)
  })

  it("n'ajoute aucune clause remuneration quand le filtre est absent", async () => {
    await listOpportunites(base)
    expect(rowsSql().sql).not.toContain('remuneration IS NULL')
  })
})

// GUIC-689 — filtre deadline : bug avant correction — écrit dans l'URL (FiltresPanel)
// mais jamais lu ni transformé en clause SQL, la liste ne changeait jamais.
describe('listOpportunites — filtre deadline (J-7 / J-30)', () => {
  it('deadline=7 : exclut les opportunités sans échéance ET borne à NOW()+7 jours', async () => {
    await listOpportunites({ ...base, deadline: '7' })
    const { sql, values } = rowsSql()
    expect(sql).toContain('deadline IS NOT NULL')
    expect(sql).toContain('DATE_ADD(NOW(), INTERVAL ? DAY)')
    expect(values).toContain(7)
  })

  it('deadline=30 : borne à NOW()+30 jours', async () => {
    await listOpportunites({ ...base, deadline: '30' })
    const { values } = rowsSql()
    expect(values).toContain(30)
  })

  it("n'ajoute aucune clause deadline quand le filtre est absent", async () => {
    await listOpportunites(base)
    expect(rowsSql().sql).not.toContain('DATE_ADD')
  })
})

describe('listOpportunites — cache Redis', () => {
  // GUIC-684 — sans le programme dans la clé, une recherche filtrée servirait le
  // résultat NON filtré mis en cache par la requête précédente.
  it('distingue les résultats par programme dans la clé de cache', async () => {
    await listOpportunites({ ...base, programme: 'yeah' })
    const cleYeah = mockRedisSet.mock.calls[0][0] as string
    mockRedisSet.mockClear()

    await listOpportunites({ ...base, programme: 'edupop' })
    const cleEdupop = mockRedisSet.mock.calls[0][0] as string

    expect(cleYeah).not.toBe(cleEdupop)
    expect(cleYeah).toContain('yeah')
  })

  // GUIC-689 — même piège que GUIC-684 : sans remuneration/deadline dans la clé,
  // basculer le filtre servirait le résultat mis en cache par la requête précédente.
  it('distingue les résultats par remuneration et deadline dans la clé de cache', async () => {
    await listOpportunites({ ...base, remuneration: 'yes' })
    const cleYes = mockRedisSet.mock.calls[0][0] as string
    mockRedisSet.mockClear()

    await listOpportunites({ ...base, remuneration: 'no' })
    const cleNo = mockRedisSet.mock.calls[0][0] as string
    mockRedisSet.mockClear()

    await listOpportunites({ ...base, deadline: '7' })
    const cleDeadline7 = mockRedisSet.mock.calls[0][0] as string

    expect(cleYes).not.toBe(cleNo)
    expect(cleYes).not.toBe(cleDeadline7)
  })

  it('sert le résultat depuis le cache sans frapper la BDD', async () => {
    const first = await listOpportunites(base)
    mockRedisGet.mockResolvedValue(JSON.stringify(first))
    mockQueryRaw.mockClear()
    const second = await listOpportunites(base)
    expect(mockQueryRaw).not.toHaveBeenCalled()
    expect(second).toEqual(first)
  })

  it('écrit en cache avec un TTL de 5 minutes en cas de miss', async () => {
    await listOpportunites(base)
    const setArgs = mockRedisSet.mock.calls[0]
    expect(setArgs).toContain('EX')
    expect(setArgs).toContain(300)
  })

  it('reste fonctionnel si Redis est indisponible', async () => {
    mockRedisGet.mockRejectedValue(new Error('redis down'))
    mockRedisSet.mockRejectedValue(new Error('redis down'))
    const res = await listOpportunites(base)
    expect(res.total).toBe(1)
    expect(res.items).toHaveLength(1)
  })
})
