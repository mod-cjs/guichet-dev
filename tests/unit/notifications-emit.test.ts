/**
 * @jest-environment node
 *
 * Tests du moteur emitEvent (GUIC-548) : résolution config/préférence/consentement,
 * gating des canaux externes, idempotence, fail-soft.
 */
const mockNotifCreate = jest.fn()
const mockConfigFind = jest.fn()
const mockPrefFind = jest.fn()
const mockEnvoiCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { create: (...a: unknown[]) => mockNotifCreate(...a) },
    notificationEventConfig: { findUnique: (...a: unknown[]) => mockConfigFind(...a) },
    notificationPreference: { findMany: (...a: unknown[]) => mockPrefFind(...a) },
    notificationEnvoi: { create: (...a: unknown[]) => mockEnvoiCreate(...a) },
  },
}))

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockRpush = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockGet(...a),
    set: (...a: unknown[]) => mockSet(...a),
    rpush: (...a: unknown[]) => mockRpush(...a),
  },
}))

const mockSendSms = jest.fn()
jest.mock('@/lib/sms/orange', () => ({ sendOrangeSms: (...a: unknown[]) => mockSendSms(...a) }))
const mockSendEmail = jest.fn()
jest.mock('@/lib/email/resend', () => ({ sendResendEmail: (...a: unknown[]) => mockSendEmail(...a) }))
const mockSendTemplate = jest.fn()
jest.mock('@/lib/whatsapp', () => ({ sendTemplateMessage: (...a: unknown[]) => mockSendTemplate(...a) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { emitEvent, type EmitContext } from '@/lib/notifications/emit'

const RECIPIENT = {
  cjsUid: 'u1',
  role: 'beneficiaire' as const,
  prenom: 'Awa',
  telephone: '+221770000000',
  email: 'awa@example.com',
}

const CTX: EmitContext = {
  entityId: 'c1',
  recipients: [RECIPIENT],
  type: 'Candidature',
  titre: 'Candidature retenue',
  contenu: 'Bravo, vous êtes retenue.',
  lien: '/jeune/candidatures',
}

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.NOTIFICATIONS_ENABLED
  mockNotifCreate.mockResolvedValue({ id: 'n1' })
  mockConfigFind.mockResolvedValue(null) // pas de config admin → catalogue
  mockPrefFind.mockResolvedValue([]) // pas de préférence
  mockGet.mockResolvedValue(null) // rien envoyé
  mockSet.mockResolvedValue('OK')
  mockRpush.mockResolvedValue(1)
  mockSendSms.mockResolvedValue(undefined)
  mockSendEmail.mockResolvedValue(undefined)
  mockSendTemplate.mockResolvedValue(undefined)
  mockEnvoiCreate.mockResolvedValue({ id: 'env1' })
  delete process.env.WHATSAPP_TEMPLATE_CANDIDATURE_STATUT
})

describe('emitEvent — in-app', () => {
  it('écrit toujours l’in-app, même sans NOTIFICATIONS_ENABLED', async () => {
    await emitEvent('candidature.statut_change', CTX)
    expect(mockNotifCreate).toHaveBeenCalledTimes(1)
    expect(mockNotifCreate.mock.calls[0][0].data).toMatchObject({ cjsUid: 'u1', type: 'Candidature' })
  })

  it('n’envoie aucun canal externe si NOTIFICATIONS_ENABLED n’est pas "true"', async () => {
    // config force sms, consentement OK, mais flag off
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['in_app', 'sms'] })
    mockPrefFind.mockResolvedValue([{ canal: 'sms', consentGiven: true, enabled: true, categoriesOff: null }])
    await emitEvent('candidature.statut_change', CTX)
    expect(mockSendSms).not.toHaveBeenCalled()
    expect(mockNotifCreate).toHaveBeenCalledTimes(1)
  })
})

describe('emitEvent — canaux externes', () => {
  beforeEach(() => {
    process.env.NOTIFICATIONS_ENABLED = 'true'
  })

  it('envoie le SMS quand config + consentement + contact sont réunis', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['in_app', 'sms'] })
    mockPrefFind.mockResolvedValue([{ canal: 'sms', consentGiven: true, enabled: true, categoriesOff: null }])
    await emitEvent('candidature.statut_change', CTX)
    expect(mockSendSms).toHaveBeenCalledWith('+221770000000', 'Bravo, vous êtes retenue.')
    expect(mockSet).toHaveBeenCalledWith('notif:sent:sms:candidature.statut_change:c1:u1', '1', 'EX', expect.any(Number))
  })

  it('ne renvoie pas si déjà envoyé (idempotence)', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['sms'] })
    mockPrefFind.mockResolvedValue([{ canal: 'sms', consentGiven: true, enabled: true, categoriesOff: null }])
    mockGet.mockResolvedValue('1') // déjà envoyé
    await emitEvent('candidature.statut_change', CTX)
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  it('sans consentement, le SMS n’est pas envoyé', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['in_app', 'sms'] })
    mockPrefFind.mockResolvedValue([{ canal: 'sms', consentGiven: false, enabled: true, categoriesOff: null }])
    await emitEvent('candidature.statut_change', CTX)
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  it('WhatsApp sans template mappé est ignoré (ni envoi, ni DLQ)', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['in_app', 'whatsapp'] })
    mockPrefFind.mockResolvedValue([{ canal: 'whatsapp', consentGiven: true, enabled: true, categoriesOff: null }])
    await emitEvent('candidature.statut_change', CTX)
    expect(mockSendTemplate).not.toHaveBeenCalled()
    expect(mockRpush).not.toHaveBeenCalled()
    expect(mockNotifCreate).toHaveBeenCalledTimes(1) // in-app livré
  })

  it('WhatsApp avec template mappé envoie le template Meta', async () => {
    process.env.WHATSAPP_TEMPLATE_CANDIDATURE_STATUT = 'candidature_statut'
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['whatsapp'] })
    mockPrefFind.mockResolvedValue([{ canal: 'whatsapp', consentGiven: true, enabled: true, categoriesOff: null }])
    await emitEvent('candidature.statut_change', CTX)
    expect(mockSendTemplate).toHaveBeenCalledWith('+221770000000', 'candidature_statut', 'fr', ['Awa', 'Candidature retenue'])
  })

  it('un échec transitoire pousse en DLQ v2 (fail-soft, pas d’exception)', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['sms'] })
    mockPrefFind.mockResolvedValue([{ canal: 'sms', consentGiven: true, enabled: true, categoriesOff: null }])
    mockSendSms.mockRejectedValue(Object.assign(new Error('rate'), { status: 429 }))
    await expect(emitEvent('candidature.statut_change', CTX)).resolves.toBeUndefined()
    expect(mockRpush).toHaveBeenCalledWith('notif:dlq:v2', expect.stringContaining('sms'))
  })

  it('journalise chaque envoi réussi dans l’historique (NotificationEnvoi)', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['sms'], mode: 'auto' })
    mockPrefFind.mockResolvedValue([{ canal: 'sms', consentGiven: true, enabled: true, categoriesOff: null }])
    await emitEvent('candidature.statut_change', CTX)
    expect(mockEnvoiCreate).toHaveBeenCalledTimes(1)
    expect(mockEnvoiCreate.mock.calls[0][0].data).toMatchObject({ canal: 'sms', statut: 'envoyee', cjsUid: 'u1' })
  })
})

describe('emitEvent — modes validation / différé', () => {
  beforeEach(() => {
    process.env.NOTIFICATIONS_ENABLED = 'true'
    mockPrefFind.mockResolvedValue([{ canal: 'sms', consentGiven: true, enabled: true, categoriesOff: null }])
  })

  it('mode validation : ligne en_attente_validation, aucun envoi', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['sms'], mode: 'validation' })
    await emitEvent('candidature.statut_change', CTX)
    expect(mockSendSms).not.toHaveBeenCalled()
    expect(mockEnvoiCreate.mock.calls[0][0].data).toMatchObject({ statut: 'en_attente_validation', canal: 'sms' })
  })

  it('mode différé : ligne planifiee avec dueAt = now + delaiMinutes', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['sms'], mode: 'differe', delaiMinutes: 120 })
    const before = Date.now()
    await emitEvent('candidature.statut_change', CTX)
    expect(mockSendSms).not.toHaveBeenCalled()
    const data = mockEnvoiCreate.mock.calls[0][0].data
    expect(data.statut).toBe('planifiee')
    const delta = (data.dueAt as Date).getTime() - before
    expect(delta).toBeGreaterThanOrEqual(119 * 60_000)
    expect(delta).toBeLessThanOrEqual(121 * 60_000)
  })

  it('mode validation : l’in-app aussi passe par la file (occurrence cohérente)', async () => {
    mockConfigFind.mockResolvedValue({ actif: true, canaux: ['in_app', 'sms'], mode: 'validation' })
    await emitEvent('candidature.statut_change', CTX)
    expect(mockNotifCreate).not.toHaveBeenCalled()
    expect(mockEnvoiCreate).toHaveBeenCalledTimes(2)
  })
})

describe('emitEvent — garde-fous', () => {
  it('config actif=false coupe tout pour ce destinataire', async () => {
    mockConfigFind.mockResolvedValue({ actif: false, canaux: ['in_app'] })
    await emitEvent('candidature.statut_change', CTX)
    expect(mockNotifCreate).not.toHaveBeenCalled()
  })

  it('événement inconnu = no-op', async () => {
    await emitEvent('inconnu.event', CTX)
    expect(mockNotifCreate).not.toHaveBeenCalled()
  })
})
