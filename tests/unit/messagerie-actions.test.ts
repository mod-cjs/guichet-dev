/**
 * @jest-environment node
 *
 * GUIC-132/133 — Actions de la messagerie interne.
 * Garanties : participation obligatoire (FORBIDDEN sinon), ownership de l'offre pour
 * contacter, corps validé, Notification au destinataire (fail-soft), audit.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organisation: { findFirst: jest.fn() },
    candidature: { findFirst: jest.fn() },
    conversation: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    message: { create: jest.fn(), updateMany: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { contacterCandidat, envoyerMessage } from '@/lib/messagerie/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const p = prisma as unknown as {
  organisation: { findFirst: jest.Mock }
  candidature: { findFirst: jest.Mock }
  conversation: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  message: { create: jest.Mock; updateMany: jest.Mock }
  notification: { create: jest.Mock }
  $transaction: jest.Mock
}

const REC = { cjsUid: 'rec-1', roles: ['recruteur'] }
const CAND = { cjsUid: 'cand-1', roles: ['beneficiaire'] }
const CONV = { id: 'conv-1', recruteurUid: 'rec-1', candidatUid: 'cand-1', candidature: { opportunite: { titre: 'Dev web' } } }

beforeEach(() => {
  jest.clearAllMocks()
  p.$transaction.mockResolvedValue([])
  p.notification.create.mockResolvedValue({})
  p.conversation.create.mockResolvedValue({ id: 'conv-new' })
  p.organisation.findFirst.mockResolvedValue({ id: 'org-1' })
})

describe('GUIC-132 — envoyerMessage', () => {
  it('non-participant → FORBIDDEN, aucune écriture', async () => {
    mockSession.mockResolvedValue(REC)
    p.conversation.findFirst.mockResolvedValue(null)
    await expect(envoyerMessage('conv-x', 'Salut')).rejects.toThrow(/FORBIDDEN/)
    expect(p.$transaction).not.toHaveBeenCalled()
  })

  it('corps vide → rejet Zod, aucune écriture', async () => {
    mockSession.mockResolvedValue(REC)
    p.conversation.findFirst.mockResolvedValue(CONV)
    await expect(envoyerMessage('conv-1', '   ')).rejects.toThrow()
    expect(p.$transaction).not.toHaveBeenCalled()
  })

  it('valide → écriture + Notification au destinataire (candidat) + audit', async () => {
    mockSession.mockResolvedValue(REC)
    p.conversation.findFirst.mockResolvedValue(CONV)
    const res = await envoyerMessage('conv-1', 'Bonjour, profil intéressant')
    expect(res).toEqual({ ok: true })
    expect(p.$transaction).toHaveBeenCalledTimes(1)
    expect(p.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cjsUid: 'cand-1', type: 'Message' }) }),
    )
    expect(mockAudit).toHaveBeenCalledWith('rec-1', 'message.send', expect.any(Object))
  })

  it('Notification en échec → envoi non interrompu (fail-soft)', async () => {
    mockSession.mockResolvedValue(REC)
    p.conversation.findFirst.mockResolvedValue(CONV)
    p.notification.create.mockRejectedValue(new Error('db down'))
    await expect(envoyerMessage('conv-1', 'Test')).resolves.toEqual({ ok: true })
  })
})

describe('GUIC-132 — contacterCandidat', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue(CAND)
    await expect(contacterCandidat('c1')).rejects.toThrow(/FORBIDDEN/)
  })

  it('offre non possédée → FORBIDDEN, pas de conversation', async () => {
    mockSession.mockResolvedValue(REC)
    p.candidature.findFirst.mockResolvedValue(null)
    await expect(contacterCandidat('c1')).rejects.toThrow(/FORBIDDEN/)
    expect(p.conversation.create).not.toHaveBeenCalled()
  })

  it('conversation existante → renvoie son id sans recréer', async () => {
    mockSession.mockResolvedValue(REC)
    p.candidature.findFirst.mockResolvedValue({ id: 'c1', cjsUid: 'cand-1' })
    p.conversation.findUnique.mockResolvedValue({ id: 'conv-existante' })
    const res = await contacterCandidat('c1')
    expect(res).toEqual({ id: 'conv-existante' })
    expect(p.conversation.create).not.toHaveBeenCalled()
  })

  it('nouvelle → crée la conversation avec les 2 participants', async () => {
    mockSession.mockResolvedValue(REC)
    p.candidature.findFirst.mockResolvedValue({ id: 'c1', cjsUid: 'cand-1' })
    p.conversation.findUnique.mockResolvedValue(null)
    const res = await contacterCandidat('c1')
    expect(res).toEqual({ id: 'conv-new' })
    expect(p.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ candidatureId: 'c1', recruteurUid: 'rec-1', candidatUid: 'cand-1' }) }),
    )
  })
})
