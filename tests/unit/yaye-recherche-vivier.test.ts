/**
 * @jest-environment node
 *
 * Le vivier de la recherche (vague 2.1).
 *
 * Défaut trouvé en rejouant l'éval sur la configuration de production : le classement
 * sémantique ne voyait que 200 offres sur 4 208, tirées par ÉCHÉANCE — un critère sans
 * rapport avec la pertinence. Vérifié en base : aucune des sept offres d'aviculture
 * actives n'entrait dans ce vivier. « Je voudrais élever des poulets » ne pouvait donc
 * pas aboutir, sauf quand le modèle ajoutait un filtre de domaine qui resserrait le
 * vivier autour de la bonne réponse.
 *
 * Autrement dit : ça marchait quand on n'en avait pas besoin.
 *
 * Correctif : quand une recherche porte des mots-clés, le premier étage devient LÉGER
 * (identifiant + texte seulement) et couvre tout le catalogue actif ; seules les offres
 * retenues par le classement sont ensuite hydratées pour l'affichage.
 */

const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { opportunite: { findMany: (...a: unknown[]) => mockFindMany(...a) } } }))

const mockRank = jest.fn()
jest.mock('@/lib/ia/semantic-rank', () => ({
  rankByRelevance: (...a: unknown[]) => mockRank(...a),
  SEARCH_THRESHOLD: 0.63,
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

import { TOOLS } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'] }

/** 400 offres légères + les 3 hydratées que le classement retiendra. */
const LEGERES = Array.from({ length: 400 }, (_, i) => ({
  id: `o-${i}`,
  titre: `Offre ${i}`,
  organisation: 'CJS',
  organisationLibelle: null,
  domaine: 'Agriculture',
  type: 'emploi',
}))
const HYDRATEES = ['o-390', 'o-391', 'o-392'].map(id => ({
  id, slug: id, titre: `Technicien en aviculture ${id}`, type: 'emploi', region: 'Thies', domaine: 'Agriculture',
  organisation: 'CJS', organisationLibelle: null, deadline: null,
  typeRef: { slug: 'emploi', libelle: 'Emploi', actionLabel: 'Postuler' },
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockRank.mockResolvedValue(HYDRATEES.map((h, i) => ({ id: h.id, score: 0.7 - i * 0.01, via: 'semantique' })))
  mockFindMany.mockResolvedValueOnce(LEGERES).mockResolvedValueOnce(HYDRATEES)
})

test('recherche par mots-clés : le 1er étage couvre TOUT le catalogue actif', async () => {
  await TOOLS.search_opportunities.execute({ q: 'élever des poulets' }, ctx)

  const premier = mockFindMany.mock.calls[0][0]
  // Plus de `take: 200` arbitraire : c'est le classement qui tranche, pas l'échéance.
  expect(premier.take).toBeUndefined()
  expect(premier.where).toMatchObject({ statut: 'publiee', deletedAt: null })
})

test('le 1er étage est LÉGER : identifiant et texte, rien de plus', async () => {
  await TOOLS.search_opportunities.execute({ q: 'élever des poulets' }, ctx)

  const select = mockFindMany.mock.calls[0][0].select
  expect(Object.keys(select).sort()).toEqual(
    ['domaine', 'id', 'organisation', 'organisationLibelle', 'titre', 'type'].sort(),
  )
  // Le coûteux (slug, deadline, typeRef) n'est chargé que pour les retenues.
  expect(select.typeRef).toBeUndefined()
  expect(select.deadline).toBeUndefined()
})

test('seules les offres RETENUES sont hydratées pour l’affichage', async () => {
  const r = await TOOLS.search_opportunities.execute({ q: 'élever des poulets' }, ctx)

  const second = mockFindMany.mock.calls[1][0]
  expect(second.where.id.in).toEqual(['o-390', 'o-391', 'o-392'])
  expect((r.block as { items: unknown[] }).items).toHaveLength(3)
})

test('l’ordre du classement est préservé à l’affichage', async () => {
  const r = await TOOLS.search_opportunities.execute({ q: 'élever des poulets' }, ctx)
  const items = (r.block as { items: Array<{ id: string }> }).items
  expect(items.map(i => i.id)).toEqual(['o-390', 'o-391', 'o-392'])
})

test('aucun résultat classé → pas de card, et le modèle le sait', async () => {
  mockRank.mockResolvedValue([])
  const r = await TOOLS.search_opportunities.execute({ q: 'pilote de ligne' }, ctx)

  expect(r.block).toBeUndefined()
  expect((r.data as { count: number }).count).toBe(0)
  expect(mockFindMany).toHaveBeenCalledTimes(1) // rien à hydrater
})

test('sans mots-clés : un seul étage, comportement d’origine', async () => {
  mockFindMany.mockReset().mockResolvedValueOnce(HYDRATEES)
  const r = await TOOLS.search_opportunities.execute({ region: 'Thies' }, ctx)

  expect(mockFindMany).toHaveBeenCalledTimes(1)
  expect(mockRank).not.toHaveBeenCalled()
  expect((r.block as { items: unknown[] }).items.length).toBeGreaterThan(0)
})
