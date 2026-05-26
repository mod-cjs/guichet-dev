/**
 * @jest-environment node
 *
 * Tests unitaires du dispatcher de notifications (GUIC-21 / GUIC-83).
 */

const mockSendTemplate = jest.fn()
jest.mock('@/lib/whatsapp', () => ({
  sendTemplateMessage: (...a: unknown[]) => mockSendTemplate(...a),
  sendTextMessage: jest.fn(),
  verifyWebhookSignature: jest.fn(),
}))

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockRpush = jest.fn()
const mockLpop = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockGet(...a),
    set: (...a: unknown[]) => mockSet(...a),
    rpush: (...a: unknown[]) => mockRpush(...a),
    lpop: (...a: unknown[]) => mockLpop(...a),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { notifyCandidatureConfirmee, drainDlq } from '@/lib/notifications'
import type { NotificationPayload, DlqJob } from '@/lib/notifications/types'

const PAYLOAD: NotificationPayload = {
  eventId: 'candidature:c1',
  prenom: 'Awa',
  telephone: '+221770000000',
  opportuniteTitre: 'Stage agri',
  organisation: 'CJS',
}

function whatsappError(status: number): Error & { status: number } {
  const e = new Error(`WhatsApp template error: ${status}`) as Error & { status: number }
  e.status = status
  return e
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NOTIFICATIONS_ENABLED = 'true'
  process.env.NOTIFICATION_CHANNELS = 'whatsapp'
  delete process.env.ALERT_WEBHOOK_URL
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  mockRpush.mockResolvedValue(1)
  mockSendTemplate.mockResolvedValue(undefined)
})

describe('notifyCandidatureConfirmee — garde-fous', () => {
  it('n’envoie rien si le consentement est absent', async () => {
    await notifyCandidatureConfirmee(PAYLOAD, false)
    expect(mockSendTemplate).not.toHaveBeenCalled()
  })

  it('n’envoie rien si NOTIFICATIONS_ENABLED n’est pas "true"', async () => {
    process.env.NOTIFICATIONS_ENABLED = 'false'
    await notifyCandidatureConfirmee(PAYLOAD, true)
    expect(mockSendTemplate).not.toHaveBeenCalled()
  })

  it('n’envoie pas sur un canal non configuré (téléphone absent)', async () => {
    await notifyCandidatureConfirmee({ ...PAYLOAD, telephone: null }, true)
    expect(mockSendTemplate).not.toHaveBeenCalled()
  })

  it('ne traite que les canaux listés dans NOTIFICATION_CHANNELS', async () => {
    process.env.NOTIFICATION_CHANNELS = 'sms'
    await notifyCandidatureConfirmee(PAYLOAD, true)
    expect(mockSendTemplate).not.toHaveBeenCalled()
  })
})

describe('notifyCandidatureConfirmee — envoi', () => {
  it('envoie via WhatsApp et pose la clé d’idempotence', async () => {
    await notifyCandidatureConfirmee(PAYLOAD, true)
    expect(mockSendTemplate).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalledWith(
      'notif:sent:whatsapp:candidature:c1',
      '1',
      'EX',
      expect.any(Number),
    )
  })

  it('est idempotent : ne renvoie pas si la clé est déjà posée', async () => {
    mockGet.mockResolvedValue('1')
    await notifyCandidatureConfirmee(PAYLOAD, true)
    expect(mockSendTemplate).not.toHaveBeenCalled()
  })

  it('pousse en DLQ sur échec transitoire (5xx)', async () => {
    mockSendTemplate.mockRejectedValue(whatsappError(503))
    await notifyCandidatureConfirmee(PAYLOAD, true)
    expect(mockRpush).toHaveBeenCalledTimes(1)
    const job = JSON.parse(mockRpush.mock.calls[0][1]) as DlqJob
    expect(job.canal).toBe('whatsapp')
    expect(job.attempts).toBe(1)
  })

  it('abandonne sans DLQ sur échec permanent (4xx)', async () => {
    mockSendTemplate.mockRejectedValue(whatsappError(400))
    await notifyCandidatureConfirmee(PAYLOAD, true)
    expect(mockRpush).not.toHaveBeenCalled()
  })
})

describe('drainDlq', () => {
  const job: DlqJob = { canal: 'whatsapp', eventId: 'candidature:c1', payload: PAYLOAD, attempts: 1 }

  it('rejoue un job avec succès et le retire de la DLQ', async () => {
    mockLpop.mockResolvedValueOnce(JSON.stringify(job)).mockResolvedValueOnce(null)
    const res = await drainDlq()
    expect(res.retried).toBe(1)
    expect(mockSendTemplate).toHaveBeenCalledTimes(1)
  })

  it('re-pousse en DLQ avec attempts incrémenté si l’échec persiste', async () => {
    mockSendTemplate.mockRejectedValue(whatsappError(503))
    mockLpop.mockResolvedValueOnce(JSON.stringify(job)).mockResolvedValueOnce(null)
    await drainDlq()
    const requeued = JSON.parse(mockRpush.mock.calls[0][1]) as DlqJob
    expect(requeued.attempts).toBe(2)
  })

  it('abandonne après 3 tentatives épuisées', async () => {
    mockSendTemplate.mockRejectedValue(whatsappError(503))
    mockLpop
      .mockResolvedValueOnce(JSON.stringify({ ...job, attempts: 2 }))
      .mockResolvedValueOnce(null)
    const res = await drainDlq()
    expect(res.abandoned).toBe(1)
    expect(mockRpush).not.toHaveBeenCalled()
  })
})
