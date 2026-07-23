/**
 * @jest-environment node
 *
 * GUIC-553 évolution — Actions Modèles d'emails du recruteur + envoi groupé.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    emailTemplate: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    organisation: { findFirst: jest.fn() },
    candidature: { findMany: jest.fn() },
    notificationEnvoi: { findMany: jest.fn(), count: jest.fn() },
  },
}))
const mockMailing = jest.fn()
jest.mock('@/lib/email/mailing', () => ({
  envoyerMailingCandidatures: (...a: unknown[]) => mockMailing(...a),
}))

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  listMesTemplates,
  enregistrerMonTemplate,
  reinitialiserMonTemplate,
  envoyerEmailGroupe,
  listMesEnvois,
} from '@/app/recruteur/modeles-emails/actions'

const mockSession = getSession as jest.Mock
const mockPrisma = prisma as unknown as {
  emailTemplate: { findMany: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock }
  organisation: { findFirst: jest.Mock }
  candidature: { findMany: jest.Mock }
  notificationEnvoi: { findMany: jest.Mock; count: jest.Mock }
}

const RECRUTEUR = { cjsUid: 'rec-1', roles: ['recruteur'] }

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(RECRUTEUR)
  mockPrisma.emailTemplate.findMany.mockResolvedValue([])
  mockPrisma.emailTemplate.upsert.mockResolvedValue({})
  mockPrisma.emailTemplate.deleteMany.mockResolvedValue({ count: 1 })
  mockPrisma.organisation.findFirst.mockResolvedValue({ id: 'org-1' })
  mockPrisma.notificationEnvoi.findMany.mockResolvedValue([])
  mockPrisma.notificationEnvoi.count.mockResolvedValue(0)
  mockPrisma.candidature.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
  mockMailing.mockResolvedValue({ envoyes: 2, sansEmail: 0, echecs: 0 })
})

describe('listMesTemplates', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(listMesTemplates()).rejects.toThrow(/FORBIDDEN/)
  })

  it('renvoie le jeu complet du recruteur', async () => {
    const all = await listMesTemplates()
    expect(all.length).toBeGreaterThanOrEqual(10)
  })
})

describe('enregistrerMonTemplate', () => {
  it('upsert SA version (cle, ownerUid=cjsUid)', async () => {
    await enregistrerMonTemplate('pipeline.retenue', 'Mon sujet', 'Mon corps suffisant.')
    const call = mockPrisma.emailTemplate.upsert.mock.calls[0][0]
    expect(call.where.cle_ownerUid).toEqual({ cle: 'pipeline.retenue', ownerUid: 'rec-1' })
    expect(call.create.sujet).toBe('Mon sujet')
  })

  it('clé hors jeu → TEMPLATE_INCONNU', async () => {
    await expect(enregistrerMonTemplate('pipeline.zzz', 'Sujet ok', 'Corps suffisant.')).rejects.toThrow(/TEMPLATE_INCONNU/)
  })
})

describe('reinitialiserMonTemplate', () => {
  it('supprime uniquement SA version', async () => {
    await reinitialiserMonTemplate('pipeline.retenue')
    expect(mockPrisma.emailTemplate.deleteMany).toHaveBeenCalledWith({
      where: { cle: 'pipeline.retenue', ownerUid: 'rec-1' },
    })
  })
})

describe('envoyerEmailGroupe', () => {
  it('filtre par ownership puis délègue au mailing avec les ids possédés', async () => {
    const res = await envoyerEmailGroupe(['c1', 'c2', 'etranger'], 'pipeline.entretien', 'Lundi 10h')
    const where = mockPrisma.candidature.findMany.mock.calls[0][0].where
    expect(where.id.in).toEqual(['c1', 'c2', 'etranger'])
    expect(where.opportunite.OR).toEqual(expect.arrayContaining([{ recruteurUid: 'rec-1' }, { organisationId: 'org-1' }]))
    expect(mockMailing).toHaveBeenCalledWith('rec-1', ['c1', 'c2'], 'pipeline.entretien', 'Lundi 10h')
    expect(res.envoyes).toBe(2)
  })

  it('aucune candidature possédée → aucun envoi', async () => {
    mockPrisma.candidature.findMany.mockResolvedValue([])
    const res = await envoyerEmailGroupe(['etranger'], 'pipeline.refus')
    expect(res).toEqual({ envoyes: 0, sansEmail: 0, echecs: 0 })
    expect(mockMailing).not.toHaveBeenCalled()
  })

  it('non-recruteur → FORBIDDEN, aucun envoi', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(envoyerEmailGroupe(['c1'], 'pipeline.refus')).rejects.toThrow(/FORBIDDEN/)
    expect(mockMailing).not.toHaveBeenCalled()
  })
})

describe('listMesEnvois', () => {
  it('scope l’historique au recruteur et aux mailings, avec le nom du template', async () => {
    mockPrisma.notificationEnvoi.findMany.mockResolvedValue([
      {
        id: 'h1', eventKey: 'recruteur.mailing.pipeline.retenue', titre: 'T', statut: 'envoyee',
        erreur: null, envoyeeA: new Date(), createdAt: new Date(),
        utilisateur: { prenom: 'Awa', nom: 'Diallo' },
      },
    ])
    mockPrisma.notificationEnvoi.count.mockResolvedValue(1)
    const page = await listMesEnvois(1)
    const where = mockPrisma.notificationEnvoi.findMany.mock.calls[0][0].where
    expect(where).toEqual({ valideePar: 'rec-1', eventKey: { startsWith: 'recruteur.mailing.' } })
    expect(page.items[0].template).toBe('Candidature retenue')
    expect(page.items[0].destinataire).toBe('Awa Diallo')
  })

  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(listMesEnvois()).rejects.toThrow(/FORBIDDEN/)
  })
})
