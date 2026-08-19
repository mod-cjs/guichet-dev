/**
 * @jest-environment node
 *
 * GUIC-537 (Phase 3) — persistance des paramètres LLM pilotables contre MariaDB réelle :
 * setLlmParams clampe AVANT d'écrire (jamais de valeur hors bornes en base), getSlotParams
 * relit clampé, null → défaut métier. Le cache Redis est invalidé à l'écriture.
 */
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { getSlotParams, setLlmParams } from '@/lib/ia/llm-config'
import { DEFAULTS_PAR_SLOT, TEMP_MAX, TOKENS_MAX } from '@/lib/ia/llm-params'

jest.setTimeout(30000)

beforeEach(async () => {
  await prisma.llmConfig.deleteMany({ where: { id: 'default' } })
  await redis.del('llm:params').catch(() => {})
  await redis.del('llm:config').catch(() => {})
})
afterAll(async () => {
  await prisma.llmConfig.deleteMany({ where: { id: 'default' } })
  await redis.del('llm:params').catch(() => {})
  await redis.quit().catch(() => {})
  await prisma.$disconnect()
})

describe('GUIC-537 — getSlotParams / setLlmParams (DB réelle)', () => {
  it('aucune ligne → défauts métier par slot', async () => {
    expect(await getSlotParams('agent')).toEqual(DEFAULTS_PAR_SLOT.agent)
    expect(await getSlotParams('judge')).toEqual(DEFAULTS_PAR_SLOT.judge)
  })

  it('setLlmParams écrit des valeurs valides et getSlotParams les relit', async () => {
    await setLlmParams({ agent: { temperature: 0.3, maxTokens: 512 } }, 'cjs-test')
    expect(await getSlotParams('agent')).toEqual({ temperature: 0.3, maxTokens: 512 })
  })

  it('valeurs hors bornes → CLAMPÉES en base (relecture directe DB confirme)', async () => {
    await setLlmParams({ judge: { temperature: 9, maxTokens: 999999 } }, 'cjs-test')
    const p = await getSlotParams('judge')
    expect(p.temperature).toBe(TEMP_MAX)
    expect(p.maxTokens).toBe(TOKENS_MAX)
    const row = await prisma.llmConfig.findUnique({ where: { id: 'default' }, select: { judgeTemp: true, judgeMaxTokens: true } })
    expect(row?.judgeTemp).toBe(TEMP_MAX)
    expect(row?.judgeMaxTokens).toBe(TOKENS_MAX)
  })

  it('null explicite → retour au défaut métier', async () => {
    await setLlmParams({ adequation: { temperature: 0.5, maxTokens: 256 } }, 'cjs-test')
    expect((await getSlotParams('adequation')).temperature).toBe(0.5)
    await setLlmParams({ adequation: { temperature: null, maxTokens: null } }, 'cjs-test')
    expect(await getSlotParams('adequation')).toEqual(DEFAULTS_PAR_SLOT.adequation)
  })
})
