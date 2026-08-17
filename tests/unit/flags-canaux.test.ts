/**
 * @jest-environment node
 *
 * GUIC-706 — Les canaux de notification passent sous le catalogue (lot 7).
 *
 * `NOTIFICATIONS_ENABLED` était le seul kill switch réel de la plateforme : une variable
 * d'environnement, tout ou rien, exigeant un redéploiement. Elle a servi — elle a permis
 * de livrer avant l'approbation des gabarits Meta — mais elle ne distingue pas l'e-mail du
 * SMS, ne se pilote pas depuis l'admin, et ne laisse aucune trace de qui l'a changée.
 *
 * Elle n'est pas supprimée pour autant. Une variable d'environnement reste le seul levier
 * qui fonctionne quand la base et Redis sont tombés — précisément le moment où l'on veut
 * pouvoir tout couper. Elle devient donc un interrupteur d'urgence qui prime sur tout, et
 * le catalogue prend le pilotage courant.
 */
const mockGetFlags = jest.fn()
jest.mock('@/lib/flags', () => ({ getFlags: () => mockGetFlags() }))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { canalOuvert } from '@/lib/flags/canaux'
import { catalogDefaults } from '@/lib/flags/catalog'

const masque = (key: string) => ({ ...catalogDefaults(), [key]: false })

beforeEach(() => {
  jest.clearAllMocks()
  mockGetFlags.mockResolvedValue(catalogDefaults())
  process.env.NOTIFICATIONS_ENABLED = 'true'
})

describe('canalOuvert — pilotage par le catalogue', () => {
  it('ouvre un canal dont le flag est ouvert', async () => {
    await expect(canalOuvert('email')).resolves.toBe(true)
  })

  it('ferme un canal dont le flag est masqué', async () => {
    mockGetFlags.mockResolvedValue(masque('x.notif_email'))
    await expect(canalOuvert('email')).resolves.toBe(false)
  })

  it('ne ferme QUE le canal visé', async () => {
    // C'est tout l'apport sur la variable d'environnement : couper l'e-mail sans couper
    // le SMS ni l'in-app.
    mockGetFlags.mockResolvedValue(masque('x.notif_email'))
    await expect(canalOuvert('sms')).resolves.toBe(true)
    await expect(canalOuvert('in_app')).resolves.toBe(true)
  })

  it('traite un canal inconnu comme ouvert', async () => {
    // Un canal ajouté au moteur sans entrée au catalogue ne doit pas devenir muet en
    // silence — le défaut fermé est bon pour un ACCÈS, pas pour une information due.
    await expect(canalOuvert('pigeon' as never)).resolves.toBe(true)
  })
})

describe('canalOuvert — l’interrupteur d’urgence prime', () => {
  it('ferme tous les canaux quand NOTIFICATIONS_ENABLED est faux', async () => {
    // Compatibilité ascendante ET dernier recours : une variable d'environnement reste le
    // seul levier disponible quand la base et Redis sont tombés.
    process.env.NOTIFICATIONS_ENABLED = 'false'
    await expect(canalOuvert('email')).resolves.toBe(false)
    await expect(canalOuvert('sms')).resolves.toBe(false)
    await expect(canalOuvert('whatsapp')).resolves.toBe(false)
  })

  it('laisse passer l’in-app même sans les canaux externes', async () => {
    // La variable n'a jamais gardé que les canaux à coût externe. L'étendre à l'in-app
    // rendrait la plateforme muette sur des événements critiques — statut de candidature,
    // convocation à un entretien.
    process.env.NOTIFICATIONS_ENABLED = 'false'
    await expect(canalOuvert('in_app')).resolves.toBe(true)
  })

  it('prime même sur un flag ouvert', async () => {
    process.env.NOTIFICATIONS_ENABLED = 'false'
    mockGetFlags.mockResolvedValue(catalogDefaults())
    await expect(canalOuvert('email')).resolves.toBe(false)
  })
})

describe('canalOuvert — dégradation', () => {
  it('laisse passer si l’état des fonctionnalités est illisible', async () => {
    // Mieux vaut une notification de trop qu'un silence : le destinataire attend
    // peut-être une réponse à sa candidature.
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(canalOuvert('email')).resolves.toBe(true)
  })

  it('respecte l’interrupteur d’urgence même en dégradation', async () => {
    // C'est justement le cas pour lequel la variable existe.
    process.env.NOTIFICATIONS_ENABLED = 'false'
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(canalOuvert('email')).resolves.toBe(false)
  })
})
