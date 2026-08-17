/**
 * @jest-environment node
 *
 * GUIC-706 — la surface offerte au modèle, en un seul endroit.
 *
 * `runAgent` et sa variante streaming réduisaient chacune registre, définitions et prompt,
 * en dupliquant la même logique. Le graphe se gardant désormais par intention, la
 * réduction cesse d'être un `filter` d'une ligne : elle doit être calculée une fois et
 * partagée, sinon les deux chemins divergeront — et c'est le chemin streaming qui sert les
 * conversations réelles.
 */
const mockGetFlags = jest.fn()
jest.mock('@/lib/flags', () => ({ getFlags: () => mockGetFlags() }))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { surfaceDisponible } from '@/lib/ia/surface-outils'
import { TOOLS, TOOL_DEFINITIONS } from '@/lib/ia/tools'
import { SYSTEM_PROMPT } from '@/lib/ia/agent'
import { catalogDefaults } from '@/lib/flags/catalog'
import { FLAG_PAR_INTENTION } from '@/lib/flags/yaye'

const masque = (...keys: string[]) => ({
  ...catalogDefaults(),
  ...Object.fromEntries(keys.map((k) => [k, false])),
})
const JEUNE = ['beneficiaire']
const noms = (d: typeof TOOL_DEFINITIONS) => d.map((x) => x.function.name)

beforeEach(() => {
  jest.clearAllMocks()
  mockGetFlags.mockResolvedValue(catalogDefaults())
})

describe('rien de masqué', () => {
  it('offre exactement la surface d’aujourd’hui', async () => {
    const s = await surfaceDisponible(JEUNE)
    expect(s.definitions).toEqual(TOOL_DEFINITIONS)
    expect(s.nomsOutils).toEqual(Object.keys(TOOLS))
    expect(s.promptSysteme).toBe(SYSTEM_PROMPT)
  })
})

describe('un module masqué', () => {
  it('retire l’outil du registre ET des définitions', async () => {
    mockGetFlags.mockResolvedValue(masque('m5.agenda'))
    const s = await surfaceDisponible(JEUNE)
    expect(s.nomsOutils).not.toContain('search_events')
    expect(noms(s.definitions)).not.toContain('search_events')
  })

  it('garde le graphe mais lui retire la seule intention concernée', async () => {
    // Le cœur du correctif : fermer la bibliothèque ne prive pas Yaye de son raisonnement
    // sur les offres.
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    const s = await surfaceDisponible(JEUNE)
    expect(noms(s.definitions)).toContain('query_knowledge_graph')
    const graphe = s.definitions.find((d) => d.function.name === 'query_knowledge_graph')
    expect(JSON.stringify(graphe)).not.toContain('livre_disponible')
    expect(JSON.stringify(graphe)).toContain('recherche')
  })
})

describe('plus aucune intention ouverte', () => {
  const TOUS_MODULES = [...new Set(Object.values(FLAG_PAR_INTENTION))]

  it('retire le graphe des définitions ET du registre', async () => {
    // Le registre compte autant que les définitions : l'agent tolère les appels émis en
    // texte brut, parsés contre ses clés. Un graphe resté au registre serait une porte
    // ouverte sur toutes les intentions qu'on vient de fermer.
    mockGetFlags.mockResolvedValue(masque(...TOUS_MODULES))
    const s = await surfaceDisponible(JEUNE)
    expect(noms(s.definitions)).not.toContain('query_knowledge_graph')
    expect(s.nomsOutils).not.toContain('query_knowledge_graph')
  })

  it('ne nomme plus le graphe dans le prompt', async () => {
    mockGetFlags.mockResolvedValue(masque(...TOUS_MODULES))
    const s = await surfaceDisponible(JEUNE)
    expect(s.promptSysteme).not.toContain('query_knowledge_graph')
  })
})

describe('audience', () => {
  it('n’ôte rien à un administrateur', async () => {
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque', 'm5.agenda'))
    const s = await surfaceDisponible(['admin'])
    expect(s.definitions).toEqual(TOOL_DEFINITIONS)
    expect(s.promptSysteme).toBe(SYSTEM_PROMPT)
  })

  it('n’ôte au conseiller que ce qui lui est fermé', async () => {
    // La bibliothèque ne ferme que pour les jeunes et les anonymes.
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    const s = await surfaceDisponible(['conseiller'])
    expect(s.nomsOutils).toContain('search_library')
    expect(JSON.stringify(s.definitions)).toContain('livre_disponible')
  })
})
