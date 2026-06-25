/**
 * @jest-environment node
 *
 * G3 (audit croisé Lot 11) — persistance du journal d'audit (table audit_logs).
 * INTÉGRATION RÉELLE MariaDB (quality-charter §3).
 */
import { prisma } from '@/lib/prisma'
import { auditPiiAccess, recordAudit } from '@/lib/audit'

jest.setTimeout(30000)

const ACTOR = 'test-audit-actor-g3'
async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { actorCjsUid: ACTOR } })
}
beforeEach(cleanup)
afterEach(cleanup)
afterAll(async () => { await prisma.$disconnect() })

describe('G3 — persistance audit (DB réelle)', () => {
  it('auditPiiAccess (fiche) persiste une ligne acteur+cible', async () => {
    await auditPiiAccess('fiche_beneficiaire.view', ACTOR, { targetCjsUid: 'target-x' })
    const rows = await prisma.auditLog.findMany({ where: { actorCjsUid: ACTOR } })
    expect(rows).toHaveLength(1)
    expect(rows[0].action).toBe('fiche_beneficiaire.view')
    expect(rows[0].targetType).toBe('utilisateur')
    expect(rows[0].targetId).toBe('target-x')
  })

  it('auditPiiAccess (export) persiste targetType collection + meta.count', async () => {
    await auditPiiAccess('export.utilisateurs', ACTOR, { count: 42 })
    const r = (await prisma.auditLog.findMany({ where: { actorCjsUid: ACTOR } }))[0]
    expect(r.targetType).toBe('collection')
    expect((r.meta as { count?: number } | null)?.count).toBe(42)
  })

  it('recordAudit persiste une action de modération (id opportunité en clair)', async () => {
    await recordAudit(ACTOR, 'opportunite.approve', {
      targetType: 'opportunite', targetId: 'opp-1', meta: { statut: 'publiee' },
    })
    const r = (await prisma.auditLog.findMany({ where: { actorCjsUid: ACTOR } }))[0]
    expect(r.action).toBe('opportunite.approve')
    expect(r.targetType).toBe('opportunite')
    expect(r.targetId).toBe('opp-1')
  })
})
