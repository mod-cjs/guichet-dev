/**
 * @jest-environment node
 *
 * Tests de l'outil réactif query_knowledge_graph (GUIC-433).
 * Le GraphPort est mocké : on vérifie le routage par intention, la portée RBAC
 * (cjsUid), les blocs cards et la méta `graph` (→ journal graph_interroge).
 */

const port = {
  searchOpportunites: jest.fn(),
  skillGap: jest.fn(),
  eligibleOpportunites: jest.fn(),
  collaborativeReco: jest.fn(),
  multiEntityPath: jest.fn(),
}
jest.mock('@/lib/ia/graph', () => ({ getGraphPort: () => port }))

const mockOppFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { opportunite: { findMany: (...a: unknown[]) => mockOppFindMany(...a) } },
}))
jest.mock('@/lib/profil-loader', () => ({ loadProfilComplet: jest.fn() }))
jest.mock('@/lib/ia/recommandation', () => ({ getRecommandations: jest.fn() }))

import { TOOLS } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'] }
const opp = { id: 'o1', slug: 's1', titre: 'Offre 1', type: 'emploi', organisation: 'ACME', region: 'Dakar', deadline: null }
const qkg = TOOLS.query_knowledge_graph

beforeEach(() => {
  Object.values(port).forEach(fn => fn.mockReset())
  mockOppFindMany.mockReset()
})

test('intention inconnue → ok:false', async () => {
  const r = await qkg.execute({ intent: 'nimporte' }, ctx)
  expect(r.ok).toBe(false)
})

test('recherche → searchOpportunites + bloc cards + méta graph', async () => {
  port.searchOpportunites.mockResolvedValueOnce([opp])
  const r = await qkg.execute({ intent: 'recherche', domaine: 'Numerique' }, ctx)
  expect(r.ok).toBe(true)
  expect(r.block).toEqual({ kind: 'opportunites', items: [opp] })
  expect(r.graph).toEqual({ template: 'search', nodesReturned: 1 })
})

test('ecart_competences : sans opportuniteId → erreur', async () => {
  const r = await qkg.execute({ intent: 'ecart_competences' }, ctx)
  expect(r.ok).toBe(false)
  expect(port.skillGap).not.toHaveBeenCalled()
})

test('ecart_competences : RBAC (cjsUid) + manquantes + formations en cards', async () => {
  port.skillGap.mockResolvedValueOnce({
    manquantes: [{ slug: 'react', libelle: 'React' }],
    formations: [opp],
  })
  const r = await qkg.execute({ intent: 'ecart_competences', opportuniteId: 'opp-X' }, ctx)
  expect(port.skillGap).toHaveBeenCalledWith({ cjsUid: 'u-1', roles: ['beneficiaire'] }, 'opp-X')
  expect((r.data as { manquantes: string[] }).manquantes).toEqual(['React'])
  expect(r.block).toEqual({ kind: 'opportunites', items: [opp] })
  expect(r.graph).toEqual({ template: 'skill_gap', nodesReturned: 2 })
})

test('eligibilite → eligibleOpportunites bornée au cjsUid', async () => {
  port.eligibleOpportunites.mockResolvedValueOnce([opp])
  const r = await qkg.execute({ intent: 'eligibilite' }, ctx)
  expect(port.eligibleOpportunites).toHaveBeenCalledWith({ cjsUid: 'u-1', roles: ['beneficiaire'] })
  expect(r.graph).toMatchObject({ template: 'eligible' })
})

test('reco_collaborative → enrichit les cards via loadOppItems', async () => {
  port.collaborativeReco.mockResolvedValueOnce([{ id: 'o1', slug: 's1', titre: 'Offre 1', popularite: 3 }])
  mockOppFindMany.mockResolvedValueOnce([{ id: 'o1', slug: 's1', titre: 'Offre 1', type: 'emploi', region: 'Dakar', organisation: 'ACME', organisationLibelle: null, deadline: null }])
  const r = await qkg.execute({ intent: 'reco_collaborative' }, ctx)
  expect(r.block).toMatchObject({ kind: 'opportunites' })
  expect(r.graph).toMatchObject({ template: 'collaborative', nodesReturned: 1 })
})

test('parcours → multiEntityPath + résumé chaîné', async () => {
  port.multiEntityPath.mockResolvedValueOnce([
    { id: 'o1', slug: 's1', titre: 'Offre 1', competence: 'React', formationTitre: 'Form React', programmeNom: 'YEAH' },
  ])
  mockOppFindMany.mockResolvedValueOnce([])
  const r = await qkg.execute({ intent: 'parcours', region: 'Dakar' }, ctx)
  expect((r.data as { parcours: unknown[] }).parcours[0]).toMatchObject({ offre: 'Offre 1', formation: 'Form React', programme: 'YEAH' })
  expect(r.graph).toMatchObject({ template: 'multi_entity_path' })
})
