/**
 * @jest-environment node
 *
 * GUIC-526 — actions admin « Rôles & rattachements » de la fiche utilisateur.
 * RED : `actions.ts` n'est encore qu'un stub.
 */
const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockAgentCreate = jest.fn()
const mockAgentDelete = jest.fn()
const mockOrgUpdate = jest.fn()
const mockOrgCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentCentre: {
      create: (...a: unknown[]) => mockAgentCreate(...a),
      delete: (...a: unknown[]) => mockAgentDelete(...a),
    },
    organisation: {
      update: (...a: unknown[]) => mockOrgUpdate(...a),
      create: (...a: unknown[]) => mockOrgCreate(...a),
    },
  },
}))

const mockRecordAudit = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/audit', () => ({
  recordAudit: (...a: unknown[]) => mockRecordAudit(...a),
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import {
  ajouterRattachementCentre,
  retirerRattachementCentre,
  lierOrganisation,
  creerOrganisationPourRecruteur,
} from '@/app/admin/utilisateurs/actions'

const adminSession = { cjsUid: 'admin-1', roles: ['admin'] }
const CJS_UID = '550e8400-e29b-41d4-a716-446655440000'

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(adminSession)
})

describe('garde admin (fail-closed)', () => {
  it.each([
    ['sans session', null],
    ['session non-admin', { cjsUid: 'u1', roles: ['beneficiaire'] }],
  ])('%s → FORBIDDEN, aucune écriture', async (_label, session) => {
    mockGetSession.mockResolvedValue(session)
    const res = await ajouterRattachementCentre({ cjsUid: CJS_UID, centreId: 'c1' })
    expect(res).toEqual({ ok: false, error: 'FORBIDDEN' })
    expect(mockAgentCreate).not.toHaveBeenCalled()
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })
})

describe('ajouterRattachementCentre', () => {
  it('crée la ligne AgentCentre (rôle conseiller par défaut) et journalise', async () => {
    mockAgentCreate.mockResolvedValue({ id: 'ac1' })
    const res = await ajouterRattachementCentre({ cjsUid: CJS_UID, centreId: 'c1' })
    expect(res).toEqual({ ok: true })
    expect(mockAgentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ cjsUid: CJS_UID, centreId: 'c1', role: 'conseiller' }),
    })
    expect(mockRecordAudit).toHaveBeenCalledWith(
      'admin-1',
      'admin.rattachement_centre.ajout',
      expect.objectContaining({ targetId: CJS_UID }),
    )
  })

  it('doublon (P2002 @@unique cjsUid+centreId) → DEJA_RATTACHE', async () => {
    mockAgentCreate.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }))
    const res = await ajouterRattachementCentre({ cjsUid: CJS_UID, centreId: 'c1' })
    expect(res).toEqual({ ok: false, error: 'DEJA_RATTACHE' })
  })

  it('entrée invalide (cjsUid vide) → VALIDATION, aucune écriture', async () => {
    const res = await ajouterRattachementCentre({ cjsUid: '', centreId: 'c1' })
    expect(res).toEqual({ ok: false, error: 'VALIDATION' })
    expect(mockAgentCreate).not.toHaveBeenCalled()
  })
})

describe('retirerRattachementCentre', () => {
  it('supprime la ligne et journalise', async () => {
    mockAgentDelete.mockResolvedValue({ id: 'ac1', cjsUid: CJS_UID })
    const res = await retirerRattachementCentre('ac1')
    expect(res).toEqual({ ok: true })
    expect(mockAgentDelete).toHaveBeenCalledWith({ where: { id: 'ac1' } })
    expect(mockRecordAudit).toHaveBeenCalledWith(
      'admin-1',
      'admin.rattachement_centre.retrait',
      expect.anything(),
    )
  })

  it('ligne introuvable (P2025) → INTROUVABLE', async () => {
    mockAgentDelete.mockRejectedValue(Object.assign(new Error('not found'), { code: 'P2025' }))
    const res = await retirerRattachementCentre('ac-inconnu')
    expect(res).toEqual({ ok: false, error: 'INTROUVABLE' })
  })
})

describe('lierOrganisation', () => {
  it('met à jour Organisation.cjsUid et journalise', async () => {
    mockOrgUpdate.mockResolvedValue({ id: 'org1' })
    const res = await lierOrganisation({ cjsUid: CJS_UID, organisationId: 'org1' })
    expect(res).toEqual({ ok: true })
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: 'org1' },
      data: { cjsUid: CJS_UID },
    })
    expect(mockRecordAudit).toHaveBeenCalledWith(
      'admin-1',
      'admin.organisation.liaison',
      expect.objectContaining({ targetId: 'org1' }),
    )
  })
})

describe('creerOrganisationPourRecruteur', () => {
  it('crée l\'organisation liée au cjsUid et journalise', async () => {
    mockOrgCreate.mockResolvedValue({ id: 'org2' })
    const res = await creerOrganisationPourRecruteur({ cjsUid: CJS_UID, nom: 'Sonatel SA' })
    expect(res).toEqual({ ok: true })
    expect(mockOrgCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ cjsUid: CJS_UID, nom: 'Sonatel SA' }),
    })
    expect(mockRecordAudit).toHaveBeenCalled()
  })

  it('nom trop court → VALIDATION, aucune écriture', async () => {
    const res = await creerOrganisationPourRecruteur({ cjsUid: CJS_UID, nom: ' ' })
    expect(res).toEqual({ ok: false, error: 'VALIDATION' })
    expect(mockOrgCreate).not.toHaveBeenCalled()
  })
})
