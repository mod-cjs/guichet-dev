/**
 * @jest-environment node
 *
 * GUIC-550 — Actions de configuration de la matrice de notifications (admin).
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    notificationEventConfig: { findMany: jest.fn(), upsert: jest.fn() },
    notificationEnvoi: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  },
}))
const mockValider = jest.fn()
const mockRejeter = jest.fn()
jest.mock('@/lib/notifications/outbox', () => ({
  validerOccurrence: (...a: unknown[]) => mockValider(...a),
  rejeterOccurrence: (...a: unknown[]) => mockRejeter(...a),
}))

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import {
  loadNotificationMatrix,
  setEventChannels,
  listEnvoisEnAttente,
  validerEnvois,
  listHistorique,
} from '@/app/admin/notifications/actions'

const mockSession = getSession as jest.Mock
const mockPrisma = prisma as unknown as {
  notificationEventConfig: { findMany: jest.Mock; upsert: jest.Mock }
  notificationEnvoi: { findMany: jest.Mock; findFirst: jest.Mock; count: jest.Mock }
}

const ADMIN = { cjsUid: 'a1', roles: ['admin'] }
const CONSEILLER = { cjsUid: 'c1', roles: ['conseiller'] }

const ENVOI_RH = {
  eventId: 'candidature.statut_change:c1', eventKey: 'candidature.statut_change',
  cjsUid: 'u1', canal: 'sms', titre: 'T', contenu: 'C', createdAt: new Date(),
}
const ENVOI_NON_RH = {
  eventId: 'evenement.cancelled:e1', eventKey: 'evenement.cancelled',
  cjsUid: 'u2', canal: 'sms', titre: 'T', contenu: 'C', createdAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.notificationEventConfig.findMany.mockResolvedValue([])
  mockPrisma.notificationEventConfig.upsert.mockResolvedValue({})
  mockPrisma.notificationEnvoi.findMany.mockResolvedValue([])
  mockPrisma.notificationEnvoi.findFirst.mockResolvedValue(null)
  mockPrisma.notificationEnvoi.count.mockResolvedValue(0)
  mockValider.mockResolvedValue(2)
  mockRejeter.mockResolvedValue(2)
})

describe('loadNotificationMatrix', () => {
  it('non-admin → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(loadNotificationMatrix()).rejects.toThrow(/FORBIDDEN/)
  })

  it('admin → matrice fusionnée avec surcharges DB', async () => {
    mockSession.mockResolvedValue(ADMIN)
    mockPrisma.notificationEventConfig.findMany.mockResolvedValue([
      { eventKey: 'candidature.statut_change', role: 'beneficiaire', canaux: ['in_app', 'sms'], actif: true },
    ])
    const matrix = await loadNotificationMatrix()
    const cell = matrix.find((c) => c.eventKey === 'candidature.statut_change' && c.role === 'beneficiaire')
    expect(cell).toMatchObject({ isOverride: true, canaux: ['in_app', 'sms'] })
  })
})

describe('setEventChannels', () => {
  it('non-admin → FORBIDDEN, aucune écriture', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(setEventChannels('candidature.statut_change', 'beneficiaire', ['in_app'], true)).rejects.toThrow(/FORBIDDEN/)
    expect(mockPrisma.notificationEventConfig.upsert).not.toHaveBeenCalled()
  })

  it('admin → upsert sur la clé (event, role) + audit', async () => {
    mockSession.mockResolvedValue(ADMIN)
    await setEventChannels('candidature.statut_change', 'beneficiaire', ['in_app', 'sms'], true)
    const call = mockPrisma.notificationEventConfig.upsert.mock.calls[0][0]
    expect(call.where.eventKey_role).toEqual({ eventKey: 'candidature.statut_change', role: 'beneficiaire' })
    expect(call.create.canaux).toEqual(['in_app', 'sms'])
    expect(call.update.canaux).toEqual(['in_app', 'sms'])
    expect(recordAudit).toHaveBeenCalledWith('a1', 'notif.config', expect.objectContaining({ targetId: 'candidature.statut_change:beneficiaire' }))
  })

  it('rejette un rôle non applicable (validation)', async () => {
    mockSession.mockResolvedValue(ADMIN)
    await expect(setEventChannels('candidature.statut_change', 'recruteur', ['in_app'], true)).rejects.toThrow(/non applicable/i)
    expect(mockPrisma.notificationEventConfig.upsert).not.toHaveBeenCalled()
  })

  it('mode differe : borne le délai (défaut 60) et le persiste', async () => {
    mockSession.mockResolvedValue(ADMIN)
    await setEventChannels('candidature.statut_change', 'beneficiaire', ['in_app'], true, 'differe', null)
    expect(mockPrisma.notificationEventConfig.upsert.mock.calls[0][0].update).toMatchObject({ mode: 'differe', delaiMinutes: 60 })
  })

  it('mode auto : delaiMinutes remis à null', async () => {
    mockSession.mockResolvedValue(ADMIN)
    await setEventChannels('candidature.statut_change', 'beneficiaire', ['in_app'], true, 'auto', 45)
    expect(mockPrisma.notificationEventConfig.upsert.mock.calls[0][0].update).toMatchObject({ mode: 'auto', delaiMinutes: null })
  })
})

describe('listEnvoisEnAttente — périmètres', () => {
  it('admin voit toutes les occurrences, groupées par eventId', async () => {
    mockSession.mockResolvedValue(ADMIN)
    mockPrisma.notificationEnvoi.findMany.mockResolvedValue([ENVOI_RH, { ...ENVOI_RH, canal: 'in_app' }, ENVOI_NON_RH])
    const occ = await listEnvoisEnAttente()
    expect(occ).toHaveLength(2)
    expect(occ.find((o) => o.eventId === ENVOI_RH.eventId)?.lignes).toBe(2)
  })

  it('conseiller ne voit que les occurrences RH (m3/m9)', async () => {
    mockSession.mockResolvedValue(CONSEILLER)
    mockPrisma.notificationEnvoi.findMany.mockResolvedValue([ENVOI_RH, ENVOI_NON_RH])
    const occ = await listEnvoisEnAttente()
    expect(occ).toHaveLength(1)
    expect(occ[0].eventKey).toBe('candidature.statut_change')
  })

  it('bénéficiaire → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(listEnvoisEnAttente()).rejects.toThrow(/FORBIDDEN/)
  })
})

describe('validerEnvois — guards', () => {
  it('conseiller peut valider une occurrence RH', async () => {
    mockSession.mockResolvedValue(CONSEILLER)
    mockPrisma.notificationEnvoi.findFirst.mockResolvedValue({ eventKey: 'candidature.statut_change' })
    const res = await validerEnvois('candidature.statut_change:c1')
    expect(res.lignes).toBe(2)
    expect(mockValider).toHaveBeenCalledWith('candidature.statut_change:c1', 'c1')
  })

  it('conseiller ne peut PAS valider une occurrence non-RH', async () => {
    mockSession.mockResolvedValue(CONSEILLER)
    mockPrisma.notificationEnvoi.findFirst.mockResolvedValue({ eventKey: 'evenement.cancelled' })
    await expect(validerEnvois('evenement.cancelled:e1')).rejects.toThrow(/FORBIDDEN/)
    expect(mockValider).not.toHaveBeenCalled()
  })

  it('admin valide tout + audit', async () => {
    mockSession.mockResolvedValue(ADMIN)
    mockPrisma.notificationEnvoi.findFirst.mockResolvedValue({ eventKey: 'evenement.cancelled' })
    await validerEnvois('evenement.cancelled:e1')
    expect(recordAudit).toHaveBeenCalledWith('a1', 'notif.valider', expect.anything())
  })
})

describe('listHistorique — libellés et filtres', () => {
  const ROW = {
    id: 'h1', canal: 'email', statut: 'envoyee', titre: 'T', erreur: null,
    envoyeeA: new Date(), createdAt: new Date(), utilisateur: { prenom: 'Awa', nom: 'Diallo' },
  }

  it('un mailing recruteur porte un libellé lisible (nom du template)', async () => {
    mockSession.mockResolvedValue(ADMIN)
    mockPrisma.notificationEnvoi.findMany.mockResolvedValue([{ ...ROW, eventKey: 'recruteur.mailing.pipeline.retenue' }])
    mockPrisma.notificationEnvoi.count.mockResolvedValue(1)
    const page = await listHistorique(1)
    expect(page.items[0].label).toBe('Mailing recruteur — Candidature retenue')
  })

  it('filtre mailings → where sur le préfixe recruteur.mailing.', async () => {
    mockSession.mockResolvedValue(ADMIN)
    await listHistorique(1, null, 'mailings')
    expect(mockPrisma.notificationEnvoi.findMany.mock.calls[0][0].where).toEqual({
      eventKey: { startsWith: 'recruteur.mailing.' },
    })
  })

  it('filtre notifications → exclusion du préfixe mailing', async () => {
    mockSession.mockResolvedValue(ADMIN)
    await listHistorique(1, null, 'notifications')
    expect(mockPrisma.notificationEnvoi.findMany.mock.calls[0][0].where).toEqual({
      NOT: { eventKey: { startsWith: 'recruteur.mailing.' } },
    })
  })
})
