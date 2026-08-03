/**
 * @jest-environment node
 *
 * GUIC-684 — Yaye doit pouvoir répondre « quels centres déploient YEAH ? » et
 * « quels partenaires y sont associés ? ».
 *
 * Les arêtes `DEPLOYE_A` et `ASSOCIE_A` sont projetées dans le graphe depuis
 * l'extension aux acteurs, mais `query_knowledge_graph` ne peut interroger que des
 * templates whitelistés : sans intention dédiée, ces relations restent inertes —
 * exactement la situation dans laquelle `FINANCE` est restée jusqu'ici.
 */

const mockActeurs = jest.fn()
jest.mock('@/lib/ia/graph', () => ({
  getGraphPort: () => ({ acteursDuProgramme: mockActeurs }),
}))

import { TOOLS } from '@/lib/ia/tools'

const outil = TOOLS.query_knowledge_graph
const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'], centreId: null }

beforeEach(() => jest.clearAllMocks())

describe('GUIC-684 — intention `acteurs_programme`', () => {
  it('est proposée à l’agent dans l’énumération des intentions', () => {
    const params = outil.definition.function.parameters as {
      properties: { intent: { enum: string[] } }
    }
    expect(params.properties.intent.enum).toContain('acteurs_programme')
  })

  it('renvoie les centres de déploiement et les partenaires associés', async () => {
    mockActeurs.mockResolvedValue({
      programme: 'YEAH',
      centres: [{ nom: 'Centre de Thiès', region: 'Thies' }],
      organisations: [{ nom: 'Enda Tiers Monde' }, { nom: 'GIZ Sénégal' }],
    })

    const res = await outil.execute({ intent: 'acteurs_programme', programme: 'yeah' }, ctx)

    expect(mockActeurs).toHaveBeenCalledWith('yeah')
    expect(res.ok).toBe(true)
    expect(res.data).toMatchObject({
      programme: 'YEAH',
      centres: [{ nom: 'Centre de Thiès', region: 'Thies' }],
      count_centres: 1,
      count_organisations: 2,
    })
  })

  it('refuse l’appel sans slug de programme plutôt que d’interroger tout le graphe', async () => {
    const res = await outil.execute({ intent: 'acteurs_programme' }, ctx)
    expect(res.ok).toBe(false)
    expect(mockActeurs).not.toHaveBeenCalled()
  })
})
