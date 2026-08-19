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
import { isLocalProvider, localModel } from './llm-client'
import { resoudreParams, clampTemp, clampMaxTokens, DEFAULTS_PAR_SLOT, type SlotParams } from './llm-params'

export interface LlmConfigValues {
  agent: string
  judge: string
  adequation: string
}

const CACHE_KEY = 'llm:config'
const PARAMS_CACHE_KEY = 'llm:params'
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

/** Modèle effectif pour un slot donné. En dev local (LMStudio), tous les slots
 *  utilisent le modèle chargé localement (`LMSTUDIO_MODEL`) — l'allowlist Vertex et
 *  la config admin ne s'appliquent pas. */
export async function getSlotModel(slot: LlmSlot): Promise<string> {
  if (isLocalProvider()) return localModel()
  return (await getLlmConfig())[slot]
}

// ─── Paramètres d'échantillonnage pilotables et bornés (GUIC-537, Phase 3) ────────

/** Valeurs brutes stockées par slot (null = défaut). Toujours relues via resoudreParams. */
type ParamsBruts = Record<LlmSlot, { temperature: number | null; maxTokens: number | null }>

const PARAMS_VIDES: ParamsBruts = {
  agent: { temperature: null, maxTokens: null },
  judge: { temperature: null, maxTokens: null },
  adequation: { temperature: null, maxTokens: null },
}

/** Lit les paramètres bruts des 3 slots (cache Redis dédié ; fail-soft → défauts). */
async function getRawParams(): Promise<ParamsBruts> {
  try {
    const cached = await redis.get(PARAMS_CACHE_KEY)
    if (cached) return JSON.parse(cached) as ParamsBruts
  } catch (err) {
    logger.warn('[llm-params] lecture cache échouée', { err: String(err) })
  }

  let raw: ParamsBruts
  try {
    const row = await prisma.llmConfig.findUnique({
      where: { id: 'default' },
      select: {
        agentTemp: true, judgeTemp: true, adequationTemp: true,
        agentMaxTokens: true, judgeMaxTokens: true, adequationMaxTokens: true,
      },
    })
    raw = row
      ? {
          agent: { temperature: row.agentTemp, maxTokens: row.agentMaxTokens },
          judge: { temperature: row.judgeTemp, maxTokens: row.judgeMaxTokens },
          adequation: { temperature: row.adequationTemp, maxTokens: row.adequationMaxTokens },
        }
      : PARAMS_VIDES
  } catch (err) {
    logger.warn('[llm-params] lecture base échouée → défauts', { err: String(err) })
    return PARAMS_VIDES
  }

  try {
    await redis.set(PARAMS_CACHE_KEY, JSON.stringify(raw), 'EX', CACHE_TTL_S)
  } catch {
    /* cache best-effort */
  }
  return raw
}

/**
 * Paramètres d'échantillonnage effectifs (bornés) pour un slot. À la différence de
 * getSlotModel, s'applique AUSSI en provider local (temp/tokens sont provider-agnostiques).
 */
export async function getSlotParams(slot: LlmSlot): Promise<SlotParams> {
  const raw = await getRawParams()
  return resoudreParams(slot, raw[slot])
}

/**
 * Écrit les paramètres d'un ou plusieurs slots après CLAMP (jamais de valeur hors bornes en
 * base), puis invalide le cache. Renvoie les valeurs effectives résultantes par slot.
 */
export async function setLlmParams(
  patch: Partial<Record<LlmSlot, { temperature?: number | null; maxTokens?: number | null }>>,
  updatedBy?: string,
): Promise<Record<LlmSlot, SlotParams>> {
  const data: Record<string, number | null> = {}
  for (const [slot, vals] of Object.entries(patch) as [LlmSlot, { temperature?: number | null; maxTokens?: number | null }][]) {
    const def = DEFAULTS_PAR_SLOT[slot]
    if (vals.temperature !== undefined) {
      data[`${slot}Temp`] = vals.temperature === null ? null : clampTemp(vals.temperature, def.temperature)
    }
    if (vals.maxTokens !== undefined) {
      data[`${slot}MaxTokens`] = vals.maxTokens === null ? null : clampMaxTokens(vals.maxTokens, def.maxTokens)
    }
  }

  // Les 3 modèles sont requis pour créer la ligne singleton si absente.
  const current = await getLlmConfig()
  await prisma.llmConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      agentModel: current.agent,
      judgeModel: current.judge,
      adequationModel: current.adequation,
      updatedBy: updatedBy ?? null,
      ...data,
    },
    update: { ...data, updatedBy: updatedBy ?? null },
  })

  try {
    await redis.del(PARAMS_CACHE_KEY)
  } catch {
    /* invalidation best-effort — le TTL court rattrapera */
  }

  return {
    agent: await getSlotParams('agent'),
    judge: await getSlotParams('judge'),
    adequation: await getSlotParams('adequation'),
  }
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
