/**
 * @jest-environment node
 *
 * Tests des adaptateurs de canaux génériques (GUIC-548/552/553) :
 * in-app (Notification), sms (Orange), email (GCP). Chacun mappe le ChannelMessage
 * vers son primitive et convertit les échecs en ChannelError (permanent vs retry).
 */
const mockNotifCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { notification: { create: (...a: unknown[]) => mockNotifCreate(...a) } } }))

const mockSendSms = jest.fn()
jest.mock('@/lib/sms/orange', () => ({ sendOrangeSms: (...a: unknown[]) => mockSendSms(...a) }))

const mockSendEmail = jest.fn()
jest.mock('@/lib/email/gcp', () => ({ sendGcpEmail: (...a: unknown[]) => mockSendEmail(...a) }))

import { inAppChannel } from '@/lib/notifications/channels/in-app'
import { smsChannel } from '@/lib/notifications/channels/sms'
import { emailChannel } from '@/lib/notifications/channels/email'
import { ChannelError, type ChannelMessage } from '@/lib/notifications/message'

const MSG: ChannelMessage = {
  eventKey: 'candidature.statut_change',
  eventId: 'candidature.statut_change:c1:u1',
  recipient: { cjsUid: 'u1', prenom: 'Awa', telephone: '+221770000000', email: 'awa@example.com' },
  type: 'Candidature',
  titre: 'Candidature retenue',
  contenu: 'Votre candidature a été retenue.',
  lien: '/jeune/candidatures',
  iconName: 'check',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockNotifCreate.mockResolvedValue({ id: 'n1' })
  mockSendSms.mockResolvedValue(undefined)
  mockSendEmail.mockResolvedValue(undefined)
})

describe('inAppChannel', () => {
  it('crée une Notification avec le bon type et destinataire', async () => {
    await inAppChannel.send(MSG)
    expect(mockNotifCreate).toHaveBeenCalledTimes(1)
    const data = mockNotifCreate.mock.calls[0][0].data
    expect(data).toMatchObject({ cjsUid: 'u1', type: 'Candidature', titre: 'Candidature retenue', lien: '/jeune/candidatures' })
  })

  it('convertit un échec DB en ChannelError transitoire', async () => {
    mockNotifCreate.mockRejectedValue(new Error('db down'))
    await expect(inAppChannel.send(MSG)).rejects.toMatchObject({ permanent: false })
  })
})

describe('smsChannel', () => {
  it('envoie le contenu via Orange au téléphone du destinataire', async () => {
    await smsChannel.send(MSG)
    expect(mockSendSms).toHaveBeenCalledWith('+221770000000', 'Votre candidature a été retenue.')
  })

  it('échoue en permanent si le téléphone est absent', async () => {
    await expect(smsChannel.send({ ...MSG, recipient: { ...MSG.recipient, telephone: null } })).rejects.toMatchObject({ permanent: true })
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  it('marque permanent un échec 4xx Orange', async () => {
    const e = Object.assign(new Error('bad'), { status: 400 })
    mockSendSms.mockRejectedValue(e)
    await expect(smsChannel.send(MSG)).rejects.toMatchObject({ permanent: true })
  })

  it('marque transitoire un 429/5xx Orange', async () => {
    const e = Object.assign(new Error('rate'), { status: 429 })
    mockSendSms.mockRejectedValue(e)
    await expect(smsChannel.send(MSG)).rejects.toMatchObject({ permanent: false })
  })
})

describe('emailChannel', () => {
  it('envoie via GCP avec sujet=titre et corps HTML + texte', async () => {
    await emailChannel.send(MSG)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    const [to, subject, html, text] = mockSendEmail.mock.calls[0]
    expect(to).toBe('awa@example.com')
    expect(subject).toBe('Candidature retenue')
    expect(html).toContain('Votre candidature a été retenue.')
    expect(text).toBe('Votre candidature a été retenue.')
  })

  it('échoue en permanent si l’adresse est absente', async () => {
    await expect(emailChannel.send({ ...MSG, recipient: { ...MSG.recipient, email: null } })).rejects.toMatchObject({ permanent: true })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

describe('ChannelError', () => {
  it('est exporté depuis message', () => {
    expect(new ChannelError('x', true).permanent).toBe(true)
  })
})
