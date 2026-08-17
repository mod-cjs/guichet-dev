/**
 * @jest-environment node
 *
 * GUIC-706 — Gardes des surfaces que le middleware ne couvre pas (lot 4).
 *
 * Le gate du lot 3 ferme les pages ET les routes d'API — vérifié sur le conteneur. Restent
 * trois surfaces qui lui échappent par construction :
 *
 *   - les SERVER ACTIONS, qui s'exécutent hors du chemin de la route qui les a appelées ;
 *   - les TÂCHES PLANIFIÉES, volontairement exclues du gate (un 404 y compterait comme un
 *     échec d'exécution et alerterait pour une fermeture voulue) ;
 *   - les WEBHOOKS entrants, exclus pour la même raison en pire (Meta et le SSO retrient).
 */
const mockGetFlags = jest.fn()
jest.mock('@/lib/flags', () => ({ getFlags: () => mockGetFlags() }))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { assertFlag, cronCourtCircuite, webhookIgnore } from '@/lib/flags/guard'
import { catalogDefaults, FEATURE_FLAGS } from '@/lib/flags/catalog'

const JEUNE = FEATURE_FLAGS.find(
  (f) => f.closes.includes('beneficiaire') && !f.closes.includes('conseiller') && !f.locked,
)!
const masque = (key: string) => ({ ...catalogDefaults(), [key]: false })

beforeEach(() => {
  jest.clearAllMocks()
  mockGetFlags.mockResolvedValue(catalogDefaults())
  mockGetSession.mockResolvedValue({ cjsUid: 'u1', roles: ['beneficiaire'] })
})

describe('assertFlag — server actions', () => {
  it('laisse passer quand la fonctionnalité est ouverte', async () => {
    await expect(assertFlag(JEUNE.key)).resolves.toBeUndefined()
  })

  it('refuse quand elle est masquée pour l’appelant', async () => {
    mockGetFlags.mockResolvedValue(masque(JEUNE.key))
    await expect(assertFlag(JEUNE.key)).rejects.toThrow()
  })

  it('ne nomme pas la fonctionnalité dans l’erreur', async () => {
    // Le message peut remonter jusqu'à l'utilisateur via une frontière d'erreur. Y mettre
    // la clé du flag révélerait l'existence de ce qu'on masque.
    mockGetFlags.mockResolvedValue(masque(JEUNE.key))
    await expect(assertFlag(JEUNE.key)).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(JEUNE.key) }),
    )
  })

  it('laisse passer un administrateur', async () => {
    mockGetFlags.mockResolvedValue(masque(JEUNE.key))
    mockGetSession.mockResolvedValue({ cjsUid: 'a1', roles: ['admin', 'beneficiaire'] })
    await expect(assertFlag(JEUNE.key)).resolves.toBeUndefined()
  })

  it('laisse passer un public que ce flag ne ferme pas', async () => {
    // Le conseiller continue de préparer : ses actions doivent aboutir même quand le
    // module est masqué aux jeunes.
    mockGetFlags.mockResolvedValue(masque(JEUNE.key))
    mockGetSession.mockResolvedValue({ cjsUid: 'c1', roles: ['conseiller', 'beneficiaire'] })
    await expect(assertFlag(JEUNE.key)).resolves.toBeUndefined()
  })

  it('refuse une clé inconnue plutôt que de l’autoriser', async () => {
    // Défaut fermé : une faute de frappe dans un appelant ne doit pas ouvrir un accès.
    await expect(assertFlag('m0.inconnu')).rejects.toThrow()
  })

  it('laisse passer si l’état est illisible', async () => {
    // Une panne d'infrastructure ne doit pas empêcher un utilisateur d'agir.
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(assertFlag(JEUNE.key)).resolves.toBeUndefined()
  })
})

describe('cronCourtCircuite — tâches planifiées', () => {
  const AVEC_CRON = FEATURE_FLAGS.find((f) => f.crons.length > 0)!

  it('laisse tourner une tâche dont le flag est ouvert', async () => {
    await expect(cronCourtCircuite(AVEC_CRON.crons[0])).resolves.toBe(false)
  })

  it('court-circuite une tâche dont le flag est masqué', async () => {
    mockGetFlags.mockResolvedValue(masque(AVEC_CRON.key))
    await expect(cronCourtCircuite(AVEC_CRON.crons[0])).resolves.toBe(true)
  })

  it('laisse tourner une tâche d’entretien même flag masqué', async () => {
    // Les tâches d'entretien préparent la donnée pour l'ouverture : les couper créerait un
    // arriéré à rattraper au pire moment, celui où l'on rouvre.
    const entretien = FEATURE_FLAGS.find((f) => f.cronsEntretien.length > 0)!
    mockGetFlags.mockResolvedValue(masque(entretien.key))
    await expect(cronCourtCircuite(entretien.cronsEntretien[0])).resolves.toBe(false)
  })

  it('laisse tourner une tâche rattachée à aucun flag', async () => {
    await expect(cronCourtCircuite('/api/cron/inexistant')).resolves.toBe(false)
  })

  it('laisse tourner si l’état est illisible', async () => {
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(cronCourtCircuite(AVEC_CRON.crons[0])).resolves.toBe(false)
  })
})

describe('webhookIgnore — surfaces entrantes', () => {
  it('accepte le traitement quand la fonctionnalité est ouverte', async () => {
    await expect(webhookIgnore('m11.whatsapp')).resolves.toBe(false)
  })

  it('demande d’ignorer quand elle est masquée', async () => {
    mockGetFlags.mockResolvedValue(masque('m11.whatsapp'))
    await expect(webhookIgnore('m11.whatsapp')).resolves.toBe(true)
  })

  it('ne consulte jamais la session', async () => {
    // Un webhook n'a pas d'utilisateur : Meta et le SSO appellent sans cookie. Résoudre
    // une audience ici n'aurait aucun sens et coûterait une lecture inutile.
    mockGetFlags.mockResolvedValue(masque('m11.whatsapp'))
    await webhookIgnore('m11.whatsapp')
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  it('traite si l’état est illisible', async () => {
    // Mieux vaut traiter un message de trop que perdre définitivement un événement
    // entrant : l'émetteur ne le rejouera pas indéfiniment.
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(webhookIgnore('m11.whatsapp')).resolves.toBe(false)
  })
})
