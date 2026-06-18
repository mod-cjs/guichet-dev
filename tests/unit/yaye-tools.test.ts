/**
 * @jest-environment node
 *
 * Tests des outils de l'agent Yaye (GUIC-259, Lot 0).
 * Vérifie la portée RBAC (cjsUid) et l'agrégation temps réel.
 */

const mockLoad = jest.fn()
jest.mock('@/lib/profil-loader', () => ({ loadProfilComplet: (...a: unknown[]) => mockLoad(...a) }))

const mockGroupBy = jest.fn()
const mockCount = jest.fn()
const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    candidature: { groupBy: (...a: unknown[]) => mockGroupBy(...a) },
    opportuniteFavorite: { count: (...a: unknown[]) => mockCount(...a) },
    opportunite: { findMany: (...a: unknown[]) => mockFindMany(...a) },
  },
}))

import { TOOLS } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'] }

beforeEach(() => {
  mockLoad.mockReset()
  mockGroupBy.mockReset()
  mockCount.mockReset()
  mockFindMany.mockReset()
})

test('get_user_profile : renvoie le profil du cjsUid en portée', async () => {
  mockLoad.mockResolvedValueOnce({ cjsUid: 'u-1', region: 'Dakar' })
  const r = await TOOLS.get_user_profile.execute({}, ctx)
  expect(mockLoad).toHaveBeenCalledWith('u-1')
  expect(r.ok).toBe(true)
})

test('get_user_profile : profil introuvable → ok:false', async () => {
  mockLoad.mockResolvedValueOnce(null)
  const r = await TOOLS.get_user_profile.execute({}, ctx)
  expect(r.ok).toBe(false)
})

test('get_realtime_data : agrège candidatures (par statut) + favoris', async () => {
  mockGroupBy.mockResolvedValueOnce([
    { statut: 'En_attente', _count: { _all: 2 } },
    { statut: 'Vue', _count: { _all: 1 } },
  ])
  mockCount.mockResolvedValueOnce(5)

  const r = await TOOLS.get_realtime_data.execute({ scope: 'tout' }, ctx)

  expect(r.ok).toBe(true)
  const data = r.data as { candidatures: { total: number; parStatut: Record<string, number> }; favoris: number }
  expect(data.candidatures.total).toBe(3)
  expect(data.candidatures.parStatut.En_attente).toBe(2)
  expect(data.favoris).toBe(5)
  expect(mockGroupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { cjsUid: 'u-1' } }))
})

test('search_opportunities : renvoie un bloc opportunites cliquable', async () => {
  mockFindMany.mockResolvedValueOnce([
    {
      id: 'o1', slug: 'dev-web', titre: 'Développeur web', type: 'Emploi',
      region: 'Dakar', organisation: 'ACME', organisationLibelle: null, deadline: new Date('2026-12-01'),
    },
  ])
  const r = await TOOLS.search_opportunities.execute({ domaine: 'Numerique' }, ctx)
  expect(r.ok).toBe(true)
  expect(r.block?.kind).toBe('opportunites')
  if (r.block?.kind === 'opportunites') {
    expect(r.block.items[0].slug).toBe('dev-web')
    expect(r.block.items[0].organisation).toBe('ACME')
  }
  // l'enum domaine valide est bien appliqué au filtre Prisma
  expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ statut: 'publiee', domaine: 'Numerique' }),
  }))
})

test('search_opportunities : aucun résultat → pas de bloc', async () => {
  mockFindMany.mockResolvedValueOnce([])
  const r = await TOOLS.search_opportunities.execute({}, ctx)
  expect(r.ok).toBe(true)
  expect(r.block).toBeUndefined()
})

test('search_opportunities : enum invalide ignoré (pas de crash Prisma)', async () => {
  mockFindMany.mockResolvedValueOnce([])
  await TOOLS.search_opportunities.execute({ domaine: 'PasUnDomaine' }, ctx)
  const where = mockFindMany.mock.calls[0][0].where
  expect(where.domaine).toBeUndefined() // valeur invalide non transmise à Prisma
})
