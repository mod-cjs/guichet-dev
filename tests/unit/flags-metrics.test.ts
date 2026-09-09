/**
 * @jest-environment node
 *
 * GUIC-706 — Comptage des accès refusés.
 *
 * Sans cette mesure, un module masqué est un angle mort : rien ne dit si des utilisateurs
 * butent dessus. Or un trafic anormal sur une fonctionnalité censée invisible signifie
 * qu'un lien subsiste quelque part — c'est le seul détecteur de fuite dont on dispose, et
 * accessoirement le seul indicateur de demande avant d'ouvrir.
 */
const mockIncr = jest.fn()
const mockExpire = jest.fn()
const mockMget = jest.fn()

jest.mock('@/lib/redis', () => ({
  redis: {
    incr: (...a: unknown[]) => mockIncr(...a),
    expire: (...a: unknown[]) => mockExpire(...a),
    mget: (...a: unknown[]) => mockMget(...a),
  },
}))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { recordFlagBlock, getFlagHits } from '@/lib/flags/metrics'

beforeEach(() => {
  jest.clearAllMocks()
  mockIncr.mockResolvedValue(1)
  mockExpire.mockResolvedValue(1)
  mockMget.mockResolvedValue([])
})

describe('recordFlagBlock', () => {
  it('compte le refus sur la clé du flag', async () => {
    await recordFlagBlock('m5.agenda')
    expect(mockIncr).toHaveBeenCalledWith(expect.stringContaining('m5.agenda'))
  })

  it('borne la rétention du compteur', async () => {
    // Un compteur sans expiration s'accumulerait indéfiniment et mêlerait le trafic d'une
    // fermeture d'il y a six mois à celui d'aujourd'hui.
    await recordFlagBlock('m5.agenda')
    expect(mockExpire).toHaveBeenCalled()
  })

  it('n’écrit rien pour une clé absente du catalogue', async () => {
    await recordFlagBlock('m0.inconnu')
    expect(mockIncr).not.toHaveBeenCalled()
  })

  it('ne propage jamais d’exception', async () => {
    // La mesure ne doit jamais faire échouer la requête qu'elle observe.
    mockIncr.mockRejectedValue(new Error('redis down'))
    await expect(recordFlagBlock('m5.agenda')).resolves.toBeUndefined()
  })
})

describe('getFlagHits', () => {
  it('rend un compteur par flag demandé', async () => {
    mockMget.mockResolvedValue(['12', '0'])
    await expect(getFlagHits(['m5.agenda', 'm6.ressources'])).resolves.toEqual({
      'm5.agenda': 12,
      'm6.ressources': 0,
    })
  })

  it('traite un compteur jamais écrit comme zéro', async () => {
    mockMget.mockResolvedValue([null])
    await expect(getFlagHits(['m5.agenda'])).resolves.toEqual({ 'm5.agenda': 0 })
  })

  it('rend des zéros plutôt que d’échouer si Redis est muet', async () => {
    // Le panneau d'administration doit rester consultable même sans Redis : l'absence de
    // mesure n'est pas une raison de refuser d'afficher l'état des fonctionnalités.
    mockMget.mockRejectedValue(new Error('redis down'))
    await expect(getFlagHits(['m5.agenda'])).resolves.toEqual({ 'm5.agenda': 0 })
  })

  it('ne va pas chercher Redis pour une liste vide', async () => {
    await expect(getFlagHits([])).resolves.toEqual({})
    expect(mockMget).not.toHaveBeenCalled()
  })
})
