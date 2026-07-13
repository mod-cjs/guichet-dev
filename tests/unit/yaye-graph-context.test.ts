/**
 * @jest-environment node
 *
 * Contextualisation de Yaye par le graphe (spec 02 §0). Le port graphe est mocké.
 */
const mockPort = {
  eligibleOpportunites: jest.fn(),
  collaborativeReco: jest.fn(),
  skillGap: jest.fn(),
}
jest.mock('@/lib/ia/graph', () => ({ getGraphPort: () => mockPort }))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { buildGraphContext } from '@/lib/ia/graph-context'

const opp = (id: string, titre: string) => ({ id, slug: id, titre, type: 'Emploi', organisation: null, region: null, deadline: null })

beforeEach(() => {
  jest.clearAllMocks()
  mockPort.eligibleOpportunites.mockResolvedValue([])
  mockPort.collaborativeReco.mockResolvedValue([])
  mockPort.skillGap.mockResolvedValue({ manquantes: [], formations: [] })
})

it('profil sans donnée graphe → contexte vide', async () => {
  expect(await buildGraphContext('u-x')).toBe('')
})

it('compose offres éligibles + écart de compétences + formation + reco collaborative', async () => {
  mockPort.eligibleOpportunites.mockResolvedValue([opp('o1', 'Développeur web Dakar'), opp('o2', 'Data analyst')])
  mockPort.skillGap.mockResolvedValue({
    manquantes: [{ slug: 'excel', libelle: 'Excel' }, { slug: 'sql', libelle: 'SQL' }],
    formations: [opp('f1', 'Initiation à SQL')],
  })
  mockPort.collaborativeReco.mockResolvedValue([{ id: 'r1', slug: 'r1', titre: 'Bootcamp code', popularite: 12 }])

  const ctx = await buildGraphContext('u-1')
  expect(ctx).toContain('Développeur web Dakar')
  expect(ctx).toContain('Excel') // écart de compétences
  expect(ctx).toContain('Initiation à SQL') // la formation qui comble (parcours — atout majeur)
  expect(ctx).toContain('Bootcamp code') // reco collaborative
  expect(mockPort.skillGap).toHaveBeenCalledWith({ cjsUid: 'u-1' }, 'o1')
})

it('fail-soft : une erreur graphe ne casse jamais', async () => {
  mockPort.eligibleOpportunites.mockRejectedValue(new Error('neo4j down'))
  expect(await buildGraphContext('u-1')).toBe('')
})
