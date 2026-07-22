/**
 * @jest-environment node
 *
 * GUIC-551 — Canal WhatsApp générique : n'envoie que si un template Meta est mappé.
 */
const mockSendTemplate = jest.fn()
jest.mock('@/lib/whatsapp', () => ({ sendTemplateMessage: (...a: unknown[]) => mockSendTemplate(...a) }))

import { whatsappGenericChannel } from '@/lib/notifications/channels/whatsapp-generic'
import type { ChannelMessage } from '@/lib/notifications/message'

const MSG: ChannelMessage = {
  eventKey: 'candidature.statut_change',
  eventId: 'candidature.statut_change:c1:u1',
  recipient: { cjsUid: 'u1', prenom: 'Awa', telephone: '+221770000000', email: null },
  type: 'Candidature',
  titre: 'Candidature retenue',
  contenu: 'Bravo.',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSendTemplate.mockResolvedValue(undefined)
  process.env.WHATSAPP_TEMPLATE_CANDIDATURE_STATUT = 'candidature_statut'
})

describe('whatsappGenericChannel', () => {
  it('isConfigured=true quand téléphone + template mappé + env présent', () => {
    expect(whatsappGenericChannel.isConfigured?.(MSG)).toBe(true)
  })

  it('isConfigured=false sans template pour l’événement', () => {
    expect(whatsappGenericChannel.isConfigured?.({ ...MSG, eventKey: 'ressource.published' })).toBe(false)
  })

  it('isConfigured=false sans téléphone', () => {
    expect(whatsappGenericChannel.isConfigured?.({ ...MSG, recipient: { ...MSG.recipient, telephone: null } })).toBe(false)
  })

  it('isConfigured=false si l’env du template est absent', () => {
    delete process.env.WHATSAPP_TEMPLATE_CANDIDATURE_STATUT
    expect(whatsappGenericChannel.isConfigured?.(MSG)).toBe(false)
  })

  it('envoie le template Meta avec les paramètres [prenom, titre]', async () => {
    await whatsappGenericChannel.send(MSG)
    expect(mockSendTemplate).toHaveBeenCalledWith('+221770000000', 'candidature_statut', 'fr', ['Awa', 'Candidature retenue'])
  })

  it('lève permanent si pas de template', async () => {
    await expect(whatsappGenericChannel.send({ ...MSG, eventKey: 'ressource.published' })).rejects.toMatchObject({ permanent: true })
  })

  it('marque permanent un échec 4xx Meta', async () => {
    mockSendTemplate.mockRejectedValue(Object.assign(new Error('rejeté'), { status: 400 }))
    await expect(whatsappGenericChannel.send(MSG)).rejects.toMatchObject({ permanent: true })
  })
})
