/**
 * @jest-environment node
 *
 * Top intentions (dashboard analytics) : tri décroissant + limite, sur les
 * résumés matérialisés. + libellé métier intentLabel.
 */

const mockGroupBy = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { yayeSessionSummary: { groupBy: (...a: unknown[]) => mockGroupBy(...a) } },
}))

import { computeTopIntentions } from '@/lib/ia/metrics/intentions'
import { intentLabel } from '@/lib/ia/tool-labels'

beforeEach(() => jest.clearAllMocks())

it('trie par fréquence décroissante et applique la limite', async () => {
  mockGroupBy.mockResolvedValue([
    { intentionPrinc: 'search_opportunities', _count: { _all: 2 } },
    { intentionPrinc: 'submit_application', _count: { _all: 5 } },
    { intentionPrinc: null, _count: { _all: 1 } },
  ])
  const res = await computeTopIntentions({}, 2)
  expect(res).toEqual([
    { intention: 'submit_application', count: 5 },
    { intention: 'search_opportunities', count: 2 },
  ])
})

it('traduit l\'intention en libellé métier', () => {
  expect(intentLabel('search_opportunities')).toBe("Recherche d'opportunités")
  expect(intentLabel('submit_application')).toBe('Candidature')
  expect(intentLabel(null)).toBe('Conversation')
  expect(intentLabel('outil_inconnu')).toBe('outil_inconnu')
})
