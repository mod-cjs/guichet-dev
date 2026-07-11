// GUIC-537 — Résolution du modèle LLM par usage (slot), pilotable depuis l'admin.
//
// Ordre de résolution par slot :
//   1. Ligne `LlmConfig` en base (choix admin, source de vérité runtime)
//   2. Variable d'environnement de repli (compat déploiement)
//   3. DEFAULT_MODEL (gemini-2.5-flash)
//
// Lecture mise en cache Redis (TTL court) + invalidation à l'écriture, pour ne pas
// taper la base à chaque appel Yaye sans jamais servir une config périmée.

import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { DEFAULT_MODEL, assertSlotModel, type LlmSlot } from './supported-models'

export interface LlmConfigValues {
  agent: string
  judge: string
  adequation: string
}

const CACHE_KEY = 'llm:config'
const CACHE_TTL_S = 60

/** Variables d'environnement de repli par slot (dans l'ordre de priorité). */
const ENV_FALLBACK: Record<LlmSlot, string[]> = {
  agent: ['YAYE_MODEL'],
  judge: ['YAYE_JUDGE_MODEL'],
  adequation: ['ADEQUATION_MODEL', 'GROQ_MODEL'],
}

function envDefault(slot: LlmSlot): string {
  for (const name of ENV_FALLBACK[slot]) {
    const v = process.env[name]
    if (v && v.trim()) return v.trim()
  }
  return DEFAULT_MODEL
}

function envConfig(): LlmConfigValues {
  return {
    agent: envDefault('agent'),
    judge: envDefault('judge'),
    adequation: envDefault('adequation'),
  }
}

/**
 * Config effective des 3 slots. Cache Redis (fail-soft : sur erreur Redis/DB on
 * retombe sur les valeurs d'environnement, jamais d'exception propagée).
 */
export async function getLlmConfig(): Promise<LlmConfigValues> {
  try {
    const cached = await redis.get(CACHE_KEY)
    if (cached) return JSON.parse(cached) as LlmConfigValues
  } catch (err) {
    logger.warn('[llm-config] lecture cache échouée', { err: String(err) })
  }

  let cfg: LlmConfigValues
  try {
    const row = await prisma.llmConfig.findUnique({ where: { id: 'default' } })
    cfg = row
      ? { agent: row.agentModel, judge: row.judgeModel, adequation: row.adequationModel }
      : envConfig()
  } catch (err) {
    logger.warn('[llm-config] lecture base échouée → fallback env', { err: String(err) })
    return envConfig()
  }

  try {
    await redis.set(CACHE_KEY, JSON.stringify(cfg), 'EX', CACHE_TTL_S)
  } catch {
    /* cache best-effort */
  }
  return cfg
}

/** Modèle effectif pour un slot donné. */
export async function getSlotModel(slot: LlmSlot): Promise<string> {
  return (await getLlmConfig())[slot]
}

/**
 * Écrit la config (upsert singleton) après validation de chaque slot fourni contre
 * l'allowlist, puis invalide le cache. Renvoie la config complète résultante.
 * @throws Error si un modèle est hors allowlist / incompatible avec son slot.
 */
export async function setLlmConfig(
  patch: Partial<LlmConfigValues>,
  updatedBy?: string,
): Promise<LlmConfigValues> {
  for (const [slot, id] of Object.entries(patch) as [LlmSlot, string][]) {
    assertSlotModel(slot, id)
  }

  const current = await getLlmConfig()
  const next: LlmConfigValues = { ...current, ...patch }

  await prisma.llmConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      agentModel: next.agent,
      judgeModel: next.judge,
      adequationModel: next.adequation,
      updatedBy: updatedBy ?? null,
    },
    update: {
      agentModel: next.agent,
      judgeModel: next.judge,
      adequationModel: next.adequation,
      updatedBy: updatedBy ?? null,
    },
  })

  try {
    await redis.del(CACHE_KEY)
  } catch {
    /* invalidation best-effort — le TTL court rattrapera */
  }
  return next
}
