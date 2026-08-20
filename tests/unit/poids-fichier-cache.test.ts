/**
 * @jest-environment node
 *
 * GUIC-709 — Le poids ne doit pas coûter un aller-retour réseau à chaque
 * affichage de fiche.
 *
 * Sans mémoire, chaque consultation d'une fiche PDF déclenche un HEAD vers la
 * source : une page publique paierait la latence d'un tiers, et la source
 * recevrait autant de requêtes que nous avons de visiteurs. Le poids d'un
 * fichier ne bouge quasiment jamais — c'est exactement ce qui se mémorise.
 *
 * Redis, comme le dédoublonnage des consultations : le projet y garde déjà ses
 * mémoires courtes, on n'introduit pas un second mécanisme de cache.
 *
 * L'absence de mesure se mémorise AUSSI, plus brièvement : sans ça, une source
 * durablement injoignable serait re-sondée à chaque visite — le pire cas
 * devient le cas fréquent.
 */
const mockGet = jest.fn()
const mockSet = jest.fn()
jest.mock('@/lib/redis', () => ({ redis: { get: (...a: unknown[]) => mockGet(...a), set: (...a: unknown[]) => mockSet(...a) } }))

jest.mock('@/lib/curation/robot/ssrf-guard', () => ({
  ipPubliqueValidee: jest.fn().mockResolvedValue('93.184.216.34'),
}))

import { poidsFichierMemo } from '@/lib/ressources/poids-fichier'

const URL_PDF = 'https://exemple.org/g.pdf'

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, headers: new Headers({ 'content-length': '2516582' }),
  }) as never
})

describe('GUIC-709 — mémoire du poids de fichier', () => {
  it('interroge la source une seule fois, puis sert la mémoire', async () => {
    await expect(poidsFichierMemo(URL_PDF)).resolves.toBe(2516582)
    expect(global.fetch).toHaveBeenCalledTimes(1)

    mockGet.mockResolvedValue('2516582')
    await expect(poidsFichierMemo(URL_PDF)).resolves.toBe(2516582)
    expect(global.fetch).toHaveBeenCalledTimes(1) // toujours une seule
  })

  it('mémorise aussi une absence de mesure, pour ne pas re-sonder une source morte', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never
    await expect(poidsFichierMemo(URL_PDF)).resolves.toBeNull()

    const marqueur = mockSet.mock.calls[0][1]
    expect(marqueur).toBe('-')

    mockGet.mockResolvedValue('-')
    global.fetch = jest.fn() as never
    await expect(poidsFichierMemo(URL_PDF)).resolves.toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('garde une mesure plus longtemps qu\'une absence de mesure', async () => {
    await poidsFichierMemo(URL_PDF)
    const ttlMesure = Number(mockSet.mock.calls[0][3])

    jest.clearAllMocks()
    mockGet.mockResolvedValue(null)
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as never
    await poidsFichierMemo(URL_PDF)
    const ttlAbsence = Number(mockSet.mock.calls[0][3])

    expect(ttlAbsence).toBeLessThan(ttlMesure)
  })

  it('un Redis en panne ne casse pas la fiche : on mesure quand même', async () => {
    mockGet.mockRejectedValue(new Error('redis down'))
    mockSet.mockRejectedValue(new Error('redis down'))
    await expect(poidsFichierMemo(URL_PDF)).resolves.toBe(2516582)
  })
})
