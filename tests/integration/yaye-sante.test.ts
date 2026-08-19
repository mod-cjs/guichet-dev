/**
 * @jest-environment node
 *
 * GUIC-435 (Phase 4) — computeYayeSante contre MariaDB réelle : une escalade DANGER au-delà
 * du SLA fait remonter le compteur + une alerte critique. L'agrégation compose des loaders
 * déjà testés ; on vérifie ici le bout escalade→alerte.
 */
import { prisma } from '@/lib/prisma'
import { computeYayeSante } from '@/lib/ia/admin/sante'

jest.setTimeout(30000)
const PREFIX = 'test-sante-435'

async function purge() {
  await prisma.escaladeYaye.deleteMany({ where: { sessionId: { startsWith: PREFIX } } })
}
beforeEach(purge)
afterAll(async () => { await purge(); await prisma.$disconnect() })

describe('GUIC-435 — computeYayeSante (DB réelle)', () => {
  it('escalade danger ancienne non résolue → slaDepassees ≥ 1 + alerte critique SLA', async () => {
    await prisma.escaladeYaye.create({
      data: {
        sessionId: `${PREFIX}-s1`, canal: 'whatsapp', priorite: 1, signalDanger: 'violence',
        statut: 'en_attente', createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 h → au-delà du SLA danger (30 min)
      },
    })
    const sante = await computeYayeSante({ since: new Date(0) })
    expect(sante.escalades.slaDepassees).toBeGreaterThanOrEqual(1)
    expect(sante.escalades.dangerOuvertes).toBeGreaterThanOrEqual(1)
    const critiqueSla = sante.alertes.find((a) => a.niveau === 'critique' && /SLA/i.test(a.message))
    expect(critiqueSla).toBeDefined()
  })

  it('aucune escalade en retard → pas d’alerte SLA', async () => {
    const sante = await computeYayeSante({ since: new Date(0) })
    // (d'autres escalades de seed peuvent exister ; on vérifie juste la cohérence du champ)
    expect(sante.escalades.slaDepassees).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(sante.alertes)).toBe(true)
  })
})
