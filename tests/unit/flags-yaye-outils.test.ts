/**
 * @jest-environment node
 *
 * GUIC-706 — Yaye ne sert plus les données d'un module masqué (niveau 1).
 *
 * L'agent expose 17 outils, dont 13 puisent dans des modules masquables. Sans garde, il
 * proposerait spontanément des événements d'un agenda fermé — et le lien de sa card
 * mènerait à un 404.
 *
 * NIVEAU 1 : la garde est posée à l'EXÉCUTION, pas sur le catalogue d'outils. L'agent
 * continue donc de connaître l'outil et peut le proposer ; il n'obtient simplement rien.
 * C'est un compromis assumé — il supprime la fuite de DONNÉES sans toucher au prompt de
 * 779 lignes, dont le réglage est empirique et dont le découpage demanderait d'éprouver à
 * nouveau le taux d'appel d'outil.
 *
 * Quatre outils restent hors garde : trois portent le contexte (`get_user_profile`,
 * `get_realtime_data`, `query_knowledge_graph`) — sans eux Yaye répond à côté plutôt que
 * de refuser — et `escalate_to_advisor` est un dispositif de sécurité déclenché de force
 * sur signal de danger.
 */
const mockGetFlags = jest.fn()
jest.mock('@/lib/flags', () => ({ getFlags: () => mockGetFlags() }))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { outilMasque, FLAG_PAR_OUTIL } from '@/lib/flags/yaye'
import { catalogDefaults, getFlagDef } from '@/lib/flags/catalog'

const masque = (key: string) => ({ ...catalogDefaults(), [key]: false })

beforeEach(() => {
  jest.clearAllMocks()
  mockGetFlags.mockResolvedValue(catalogDefaults())
})

describe('table de correspondance', () => {
  it('ne rattache un outil qu’à une fonctionnalité réelle', () => {
    for (const key of Object.values(FLAG_PAR_OUTIL)) {
      expect(getFlagDef(key)).toBeDefined()
    }
  })

  it('laisse hors garde les outils de contexte et la sécurité', () => {
    // Retirer le contexte ferait répondre Yaye à côté au lieu de refuser proprement, et
    // retirer l'escalade priverait de recours humain une personne en détresse.
    for (const outil of [
      'get_user_profile',
      'get_realtime_data',
      'query_knowledge_graph',
      'escalate_to_advisor',
    ]) {
      expect(FLAG_PAR_OUTIL[outil]).toBeUndefined()
    }
  })

  it('couvre les outils qui puisent dans un module masquable', () => {
    for (const outil of [
      'search_opportunities',
      'search_events',
      'search_resources',
      'find_centres',
      'search_library',
      'borrow_book',
      'get_active_loans',
      'get_badge',
      'reserve_resource',
      'submit_application',
    ]) {
      expect(FLAG_PAR_OUTIL[outil]).toBeDefined()
    }
  })
})

describe('outilMasque', () => {
  it('laisse passer un outil dont le module est ouvert', async () => {
    await expect(outilMasque('search_events', ['beneficiaire'])).resolves.toBe(false)
  })

  it('bloque un outil dont le module est masqué', async () => {
    mockGetFlags.mockResolvedValue(masque('m5.agenda'))
    await expect(outilMasque('search_events', ['beneficiaire'])).resolves.toBe(true)
  })

  it('ne bloque pas les autres outils', async () => {
    mockGetFlags.mockResolvedValue(masque('m5.agenda'))
    await expect(outilMasque('search_opportunities', ['beneficiaire'])).resolves.toBe(false)
  })

  it('laisse passer un outil hors table', async () => {
    mockGetFlags.mockResolvedValue(masque('m5.agenda'))
    await expect(outilMasque('escalate_to_advisor', ['beneficiaire'])).resolves.toBe(false)
  })

  it('respecte la face d’audience', async () => {
    // Yaye répond aussi au conseiller. Un module fermé aux seuls jeunes ne doit pas lui
    // retirer l'outil.
    mockGetFlags.mockResolvedValue(masque('m5.agenda'))
    await expect(outilMasque('search_events', ['conseiller', 'beneficiaire'])).resolves.toBe(false)
  })

  it('laisse passer un administrateur', async () => {
    mockGetFlags.mockResolvedValue(masque('m5.agenda'))
    await expect(outilMasque('search_events', ['admin'])).resolves.toBe(false)
  })

  it('bloque un visiteur sans session sur un module fermé aux anonymes', async () => {
    // La bulle Yaye est montée sur les pages publiques : l'interlocuteur n'a pas toujours
    // de compte.
    mockGetFlags.mockResolvedValue(masque('m5.agenda'))
    await expect(outilMasque('search_events', null)).resolves.toBe(true)
  })

  it('laisse passer si l’état est illisible', async () => {
    // Une panne ne doit pas rendre l'assistant inutile ; le gate protège déjà les pages
    // vers lesquelles ses cards renvoient.
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(outilMasque('search_events', ['beneficiaire'])).resolves.toBe(false)
  })
})
