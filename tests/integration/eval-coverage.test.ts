/**
 * @jest-environment node
 *
 * GUIC-435 (Phase 2) — computeEvalCoverage contre MariaDB réelle : évaluées/total (le « — »
 * = non évalué, pas mauvais).
 */
import { prisma } from '@/lib/prisma'
import { computeEvalCoverage } from '@/lib/ia/metrics/eval-coverage'

jest.setTimeout(30000)
const PREFIX = 'test-cov-435'

async function purge() {
  await prisma.yayeSessionSummary.deleteMany({ where: { sessionId: { startsWith: PREFIX } } })
}
async function s(i: number, yqs: number | null) {
  await prisma.yayeSessionSummary.create({
    data: { sessionId: `${PREFIX}-${i}`, canal: 'web', nbTours: 1, dureeMs: 100, yqs },
  })
}
beforeAll(async () => {
  await purge()
  for (let i = 0; i < 3; i++) await s(i, 80) // 3 évaluées
  for (let i = 3; i < 10; i++) await s(i, null) // 7 non évaluées
})
afterAll(async () => { await purge(); await prisma.$disconnect() })

describe('GUIC-435 — computeEvalCoverage (DB réelle)', () => {
  it('compte évaluées / total et le pourcentage sur mes sessions', async () => {
    // fenêtre large ; on filtre sur mes lignes via un since qui les couvre toutes
    const cov = await computeEvalCoverage({ since: new Date(Date.now() - 60 * 60 * 1000) })
    // au moins mes 10 sessions (d'autres peuvent exister) — on vérifie la cohérence relative
    expect(cov.total).toBeGreaterThanOrEqual(10)
    expect(cov.evaluees).toBeGreaterThanOrEqual(3)
    expect(cov.evaluees).toBeLessThanOrEqual(cov.total)
    expect(cov.pct).toBe(Math.round((cov.evaluees / cov.total) * 100))
  })
})
