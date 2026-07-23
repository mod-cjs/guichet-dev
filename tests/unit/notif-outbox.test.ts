/**
 * @jest-environment node
 *
 * Tests de l'outbox (GUIC-547 évolution) : validation/rejet d'occurrence,
 * envoi différé, drain DLQ v2.
 */
const mockEnvoiFindMany = jest.fn()
const mockEnvoiUpdate = jest.fn()
const mockEnvoiUpdateMany = jest.fn()
const mockUserFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    notificationEnvoi: {
      findMany: (...a: unknown[]) => mockEnvoiFindMany(...a),
      update: (...a: unknown[]) => mockEnvoiUpdate(...a),
      updateMany: (...a: unknown[]) => mockEnvoiUpdateMany(...a),
    },
    utilisateur: { findUnique: (...a: unknown[]) => mockUserFind(...a) },
    notification: { create: jest.fn().mockResolvedValue({ id: 'n1' }) },
  },
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

const mockSendSms = jest.fn()
jest.mock('@/lib/sms/orange', () => ({ sendOrangeSms: (...a: unknown[]) => mockSendSms(...a) }))
jest.mock('@/lib/email/resend', () => ({ sendResendEmail: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/whatsapp', () => ({ sendTemplateMessage: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { validerOccurrence, rejeterOccurrence, flushPlanifiees, drainEngineDlq } from '@/lib/notifications/outbox'

const ROW = {
  id: 'env1',
  eventKey: 'candidature.statut_change',
  eventId: 'candidature.statut_change:c1:u1',
  cjsUid: 'u1',
  role: 'beneficiaire',
  canal: 'sms',
  type: 'Candidature',
  titre: 'Candidature retenue',
  contenu: 'Bravo.',
  lien: null,
  iconName: null,
  statut: 'en_attente_validation',
  erreur: null,
  valideePar: null,
  dueAt: null,
  envoyeeA: null,
  createdAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEnvoiFindMany.mockResolvedValue([ROW])
  mockEnvoiUpdate.mockResolvedValue({})
  mockEnvoiUpdateMany.mockResolvedValue({ count: 1 })
  mockUserFind.mockResolvedValue({ prenom: 'Awa', telephone: '+221770000000', email: 'a@x.sn' })
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  mockSendSms.mockResolvedValue(undefined)
})

describe('validerOccurrence', () => {
  it('envoie toutes les lignes en attente et trace le valideur', async () => {
    const n = await validerOccurrence('candidature.statut_change:c1:u1', 'admin-1')
    expect(n).toBe(1)
    expect(mockSendSms).toHaveBeenCalledWith('+221770000000', 'Bravo.')
    const update = mockEnvoiUpdate.mock.calls[0][0]
    expect(update.data).toMatchObject({ statut: 'envoyee', valideePar: 'admin-1' })
  })

  it('relit les coordonnées fraîches du destinataire', async () => {
    await validerOccurrence('x', 'admin-1')
    expect(mockUserFind).toHaveBeenCalledWith(expect.objectContaining({ where: { cjsUid: 'u1' } }))
  })

  it('destinataire disparu → ligne abandonnée sans envoi', async () => {
    mockUserFind.mockResolvedValue(null)
    await validerOccurrence('x', 'admin-1')
    expect(mockSendSms).not.toHaveBeenCalled()
    expect(mockEnvoiUpdate.mock.calls[0][0].data.statut).toBe('abandonnee')
  })
})

describe('rejeterOccurrence', () => {
  it('marque rejetee sans rien envoyer', async () => {
    const n = await rejeterOccurrence('x', 'admin-1')
    expect(n).toBe(1)
    expect(mockSendSms).not.toHaveBeenCalled()
    expect(mockEnvoiUpdateMany.mock.calls[0][0].data).toMatchObject({ statut: 'rejetee', valideePar: 'admin-1' })
  })
})

describe('flushPlanifiees', () => {
  it('envoie les lignes planifiées arrivées à échéance', async () => {
    mockEnvoiFindMany.mockResolvedValue([{ ...ROW, statut: 'planifiee', dueAt: new Date(0) }])
    const n = await flushPlanifiees(new Date())
    expect(n).toBe(1)
    expect(mockSendSms).toHaveBeenCalled()
    expect(mockEnvoiFindMany.mock.calls[0][0].where.statut).toBe('planifiee')
  })
})

describe('drainEngineDlq', () => {
  it('rejoue un job et met à jour la ligne liée', async () => {
    const job = { canal: 'sms', envoiId: 'env1', attempts: 0, msg: { eventKey: 'x', eventId: 'e', recipient: { cjsUid: 'u1', prenom: 'A', telephone: '+221770000000', email: null }, type: 'Candidature', titre: 't', contenu: 'c' } }
    mockLpop.mockResolvedValueOnce(JSON.stringify(job)).mockResolvedValue(null)
    const res = await drainEngineDlq(10)
    expect(res.replayed).toBe(1)
    expect(mockEnvoiUpdate.mock.calls[0][0].data.statut).toBe('envoyee')
  })

  it('abandonne après MAX_ATTEMPTS et marque la ligne', async () => {
    const job = { canal: 'sms', envoiId: 'env1', attempts: 2, msg: { eventKey: 'x', eventId: 'e', recipient: { cjsUid: 'u1', prenom: 'A', telephone: '+221770000000', email: null }, type: 'Candidature', titre: 't', contenu: 'c' } }
    mockLpop.mockResolvedValueOnce(JSON.stringify(job)).mockResolvedValue(null)
    mockSendSms.mockRejectedValue(Object.assign(new Error('rate'), { status: 429 }))
    const res = await drainEngineDlq(10)
    expect(res.abandoned).toBe(1)
    expect(mockEnvoiUpdate.mock.calls[0][0].data.statut).toBe('abandonnee')
  })
})
