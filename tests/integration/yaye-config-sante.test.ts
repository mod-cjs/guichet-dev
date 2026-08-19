/**
 * @jest-environment node
 *
 * GUIC-435 (Phase 3 — volet hors-ligne) — computeConfigSante contre MariaDB réelle : la
 * source de la config (ligne LlmConfig admin vs env/défaut) et l'alerte endpoint-dédié
 * pour un modèle self-deployed remontent bien depuis la vraie base. Aucun appel LLM.
 */
import { prisma } from '@/lib/prisma'
import { computeConfigSante } from '@/lib/ia/admin/config-sante'
import { redis } from '@/lib/redis'

jest.setTimeout(30000)

const ENDPOINT_ENV = 'VERTEX_DEDICATED_ENDPOINT_URL'
let savedEndpoint: string | undefined

beforeEach(async () => {
  savedEndpoint = process.env[ENDPOINT_ENV]
  delete process.env[ENDPOINT_ENV]
  await prisma.llmConfig.deleteMany({ where: { id: 'default' } })
})
afterAll(async () => {
  if (savedEndpoint === undefined) delete process.env[ENDPOINT_ENV]
  else process.env[ENDPOINT_ENV] = savedEndpoint
  await prisma.llmConfig.deleteMany({ where: { id: 'default' } })
  await redis.quit().catch(() => {})
  await prisma.$disconnect()
})

describe('GUIC-435 — computeConfigSante (DB réelle)', () => {
  it('aucune ligne LlmConfig → 3 slots résolus, sains, source ≠ admin', async () => {
    const sante = await computeConfigSante()
    expect(sante.slots).toHaveLength(3)
    expect(sante.slots.every((s) => s.autorise && s.capacitesOk)).toBe(true)
    expect(sante.slots.every((s) => s.source !== 'admin')).toBe(true)
    expect(sante.alertes).toEqual([])
  })

  it('ligne admin avec modèle self-deployed sans endpoint dédié → source admin + alerte warn', async () => {
    await prisma.llmConfig.create({
      data: {
        id: 'default',
        agentModel: 'google/gemma-3-4b-it', // self-deployed
        judgeModel: 'google/gemini-2.5-pro',
        adequationModel: 'google/gemini-2.5-flash',
      },
    })
    const sante = await computeConfigSante()
    const agent = sante.slots.find((s) => s.slot === 'agent')!
    expect(agent.source).toBe('admin')
    expect(agent.endpointDedieRequis).toBe(true)
    expect(sante.alertes.some((a) => a.niveau === 'warn' && /dédié|endpoint/i.test(a.message))).toBe(true)
  })
})
