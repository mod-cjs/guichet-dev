/**
 * @jest-environment node
 *
 * GUIC-647 — Actions groupées du kanban recruteur (déplacement, statut, favori)
 * + réintégration d'une refusée. Garde fail-closed, ownership résolu id par id,
 * audit par candidature, notification candidat (GUIC-547) par changement de statut.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))
jest.mock('@/lib/notifications/candidature-statut', () => ({ notifyCandidatStatutChange: jest.fn() }))
// GUIC-538 — mock Prisma partagé.
jest.mock('@/lib/prisma')

import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { notifyCandidatStatutChange } from '@/lib/notifications/candidature-statut'
import { prisma } from '@/lib/prisma'
import {
  deplacerPipelineGroupe,
  changerStatutGroupe,
  basculerFavoriGroupe,
  reintegrerCandidature,
} from '@/app/recruteur/candidatures/actions'

const mockSession = getSession as jest.Mock
const mockAudit = recordAudit as jest.Mock
const mockNotify = notifyCandidatStatutChange as jest.Mock
const p = prisma as unknown as {
  organisation: { findFirst: jest.Mock }
  candidature: { findMany: jest.Mock; updateMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
}
const REC = { cjsUid: 'rec-1', roles: ['recruteur'] }

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(REC)
  p.organisation.findFirst.mockResolvedValue({ id: 'org-1' })
  p.candidature.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
  p.candidature.updateMany.mockResolvedValue({ count: 2 })
  p.candidature.findFirst.mockResolvedValue({ id: 'c1' })
  p.candidature.update.mockResolvedValue({})
})

describe('GUIC-647 — deplacerPipelineGroupe', () => {
  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(deplacerPipelineGroupe(['c1'], 'Preselection')).rejects.toThrow(/FORBIDDEN/)
    expect(p.candidature.updateMany).not.toHaveBeenCalled()
  })

  it('ids vides → rejet zod', async () => {
    await expect(deplacerPipelineGroupe([], 'Preselection')).rejects.toThrow()
  })

  it('plus de 100 ids → rejet zod', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `c${i}`)
    await expect(deplacerPipelineGroupe(ids, 'Preselection')).rejects.toThrow()
  })

  it('étape invalide → rejet zod', async () => {
    await expect(deplacerPipelineGroupe(['c1'], 'Nimportequoi')).rejects.toThrow()
  })

  it('ownership : seuls les ids possédés sont modifiés, audit par candidature', async () => {
    const res = await deplacerPipelineGroupe(['c1', 'c2', 'cX'], 'Entretien')
    // Résolution des ids possédés (bornée aux offres du recruteur).
    const findWhere = p.candidature.findMany.mock.calls[0][0].where
    expect(findWhere.id).toEqual({ in: ['c1', 'c2', 'cX'] })
    expect(findWhere.opportunite).toBeTruthy()
    // Mise à jour uniquement des possédés.
    const upd = p.candidature.updateMany.mock.calls[0][0]
    expect(upd.where.id).toEqual({ in: ['c1', 'c2'] })
    expect(upd.data).toEqual({ pipelineStage: 'Entretien' })
    expect(res.count).toBe(2)
    // Audit par candidature, marqué groupé.
    expect(mockAudit).toHaveBeenCalledTimes(2)
    expect(mockAudit).toHaveBeenCalledWith('rec-1', 'candidature.pipeline',
      expect.objectContaining({ targetId: 'c1', meta: expect.objectContaining({ stage: 'Entretien', groupe: true }) }))
  })

  it('aucun id possédé → count 0 sans update', async () => {
    p.candidature.findMany.mockResolvedValue([])
    const res = await deplacerPipelineGroupe(['cX'], 'Entretien')
    expect(res.count).toBe(0)
    expect(p.candidature.updateMany).not.toHaveBeenCalled()
    expect(mockAudit).not.toHaveBeenCalled()
  })
})

describe('GUIC-647 — changerStatutGroupe', () => {
  it('statut hors {Vue,Retenue,Refusee} → rejet zod', async () => {
    await expect(changerStatutGroupe(['c1'], 'En_attente')).rejects.toThrow()
  })

  it('décision groupée → force pipelineStage Decision + notifie chaque candidat', async () => {
    const res = await changerStatutGroupe(['c1', 'c2'], 'Refusee')
    const upd = p.candidature.updateMany.mock.calls[0][0]
    expect(upd.where.id).toEqual({ in: ['c1', 'c2'] })
    expect(upd.data).toEqual({ statut: 'Refusee', pipelineStage: 'Decision' })
    expect(res.count).toBe(2)
    expect(mockAudit).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenCalledWith('c1', 'Refusee')
    expect(mockNotify).toHaveBeenCalledWith('c2', 'Refusee')
  })

  it('Vue groupé → ne touche pas le pipelineStage', async () => {
    await changerStatutGroupe(['c1', 'c2'], 'Vue')
    expect(p.candidature.updateMany.mock.calls[0][0].data).toEqual({ statut: 'Vue' })
  })

  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue({ cjsUid: 'j', roles: ['beneficiaire'] })
    await expect(changerStatutGroupe(['c1'], 'Retenue')).rejects.toThrow(/FORBIDDEN/)
    expect(mockNotify).not.toHaveBeenCalled()
  })
})

describe('GUIC-647 — basculerFavoriGroupe', () => {
  it('applique le favori demandé aux ids possédés', async () => {
    const res = await basculerFavoriGroupe(['c1', 'c2', 'cX'], true)
    const upd = p.candidature.updateMany.mock.calls[0][0]
    expect(upd.where.id).toEqual({ in: ['c1', 'c2'] })
    expect(upd.data).toEqual({ favoriRecruteur: true })
    expect(res.count).toBe(2)
  })
})

describe('GUIC-647 — reintegrerCandidature', () => {
  it('refusée possédée → statut Vue + retour colonne Reçues + audit', async () => {
    await reintegrerCandidature('c1')
    const find = p.candidature.findFirst.mock.calls[0][0]
    expect(find.where.id).toBe('c1')
    expect(find.where.statut).toBe('Refusee')
    expect(find.where.opportunite).toBeTruthy()
    expect(p.candidature.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' }, data: { statut: 'Vue', pipelineStage: 'Recue' } }),
    )
    expect(mockAudit).toHaveBeenCalledWith('rec-1', 'candidature.reintegre',
      expect.objectContaining({ targetId: 'c1' }))
  })

  it('non refusée ou non possédée → NOT_FOUND', async () => {
    p.candidature.findFirst.mockResolvedValue(null)
    await expect(reintegrerCandidature('cX')).rejects.toThrow(/NOT_FOUND/)
    expect(p.candidature.update).not.toHaveBeenCalled()
  })

  it('non-recruteur → FORBIDDEN', async () => {
    mockSession.mockResolvedValue(null)
    await expect(reintegrerCandidature('c1')).rejects.toThrow(/FORBIDDEN/)
  })
})
