/**
 * @jest-environment node
 *
 * GUIC-435 (Phase 2) — computeIntentionsEnEchec contre MariaDB réelle : croise
 * intention × issues sur yaye_session_summaries et classe le pire en tête.
 */
import { prisma } from '@/lib/prisma'
import { computeIntentionsEnEchec } from '@/lib/ia/metrics/intentions-echec'

jest.setTimeout(30000)

const PREFIX = 'test-intent-435'

async function purge() {
  await prisma.yayeSessionSummary.deleteMany({ where: { sessionId: { startsWith: PREFIX } } })
}

async function summary(i: number, intention: string, o: { resolu?: boolean; escalade?: boolean; drapeauRouge?: boolean; yqs?: number | null }) {
  await prisma.yayeSessionSummary.create({
    data: {
      sessionId: `${PREFIX}-${intention}-${i}`, canal: 'whatsapp', nbTours: 3, dureeMs: 1000,
      intentionPrinc: intention, resolu: o.resolu ?? false, escalade: o.escalade ?? false,
      drapeauRouge: o.drapeauRouge ?? false, yqs: o.yqs ?? null,
    },
  })
}

beforeAll(async () => {
  await purge()
  // "bourse-435" : sain (8/8 résolus, yqs ~90)
  for (let i = 0; i < 8; i++) await summary(i, 'bourse-435', { resolu: true, yqs: 90 })
  // "danger-435" : en échec (1/8 résolu, 4 escalades, 2 drapeaux, yqs ~40)
  for (let i = 0; i < 8; i++) await summary(i, 'danger-435', { resolu: i === 0, escalade: i < 4, drapeauRouge: i < 2, yqs: 40 })
})
afterAll(async () => {
  await purge()
  await prisma.$disconnect()
})

describe('GUIC-435 — computeIntentionsEnEchec (DB réelle)', () => {
  it('classe l’intention en échec avant l’intention saine', async () => {
    const rows = (await computeIntentionsEnEchec({ since: new Date(0), minVolume: 5 }))
      .filter((r) => r.intention.endsWith('-435'))
    const danger = rows.find((r) => r.intention === 'danger-435')!
    const bourse = rows.find((r) => r.intention === 'bourse-435')!
    expect(danger).toBeDefined()
    expect(bourse).toBeDefined()
    expect(rows.indexOf(danger)).toBeLessThan(rows.indexOf(bourse)) // le pire d'abord
    expect(danger.tauxResolu).toBeLessThan(bourse.tauxResolu)
    expect(danger.tauxEscalade).toBeGreaterThan(0)
    expect(danger.yqsMoyen).toBe(40)
    expect(bourse.yqsMoyen).toBe(90)
  })

  it('respecte minVolume (le bruit à faible volume est écarté)', async () => {
    await summary(99, 'rare-435', { resolu: false, escalade: true })
    const rows = await computeIntentionsEnEchec({ since: new Date(0), minVolume: 5 })
    expect(rows.find((r) => r.intention === 'rare-435')).toBeUndefined()
  })
})
