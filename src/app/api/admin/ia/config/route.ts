// GUIC-537 — API admin de configuration du modèle LLM (Vertex) par usage.
// GET  : config effective + allowlist. PUT : met à jour les slots fournis (validés).
// RBAC admin. Toute écriture est journalisée (journal d'audit).

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { recordAudit } from '@/lib/audit'
import { getLlmConfig, setLlmConfig, getSlotParams, setLlmParams } from '@/lib/ia/llm-config'
import { SUPPORTED_MODELS, type LlmSlot } from '@/lib/ia/supported-models'
import { TEMP_MIN, TEMP_MAX, TOKENS_MIN, TOKENS_MAX } from '@/lib/ia/llm-params'

const SLOTS: readonly LlmSlot[] = ['agent', 'judge', 'adequation']

/** Params effectifs des 3 slots (pour le GET). */
async function allParams() {
  const [agent, judge, adequation] = await Promise.all([
    getSlotParams('agent'), getSlotParams('judge'), getSlotParams('adequation'),
  ])
  return { agent, judge, adequation }
}

/** Lit un nombre optionnel d'un corps JSON ; undefined si absent, null si explicitement null. */
function numOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function forbidden() {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
    { status: 403 },
  )
}

export async function GET() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) return forbidden()

  const [config, params] = await Promise.all([getLlmConfig(), allParams()])
  return NextResponse.json({
    data: {
      config,
      params,
      models: SUPPORTED_MODELS,
      bornes: { tempMin: TEMP_MIN, tempMax: TEMP_MAX, tokensMin: TOKENS_MIN, tokensMax: TOKENS_MAX },
    },
  })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) return forbidden()

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    /* corps invalide → patch vide → 400 plus bas */
  }

  const patch: Partial<Record<LlmSlot, string>> = {}
  const paramsPatch: Partial<Record<LlmSlot, { temperature?: number | null; maxTokens?: number | null }>> = {}
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    for (const slot of SLOTS) {
      const v = b[slot]
      if (typeof v === 'string' && v.trim()) patch[slot] = v.trim()
    }
    // Params d'échantillonnage optionnels : { params: { agent: { temperature, maxTokens }, … } }
    const rawParams = b.params
    if (rawParams && typeof rawParams === 'object') {
      for (const slot of SLOTS) {
        const sp = (rawParams as Record<string, unknown>)[slot]
        if (sp && typeof sp === 'object') {
          const temperature = numOrNull((sp as Record<string, unknown>).temperature)
          const maxTokens = numOrNull((sp as Record<string, unknown>).maxTokens)
          const entry: { temperature?: number | null; maxTokens?: number | null } = {}
          if (temperature !== undefined) entry.temperature = temperature
          if (maxTokens !== undefined) entry.maxTokens = maxTokens
          if (Object.keys(entry).length > 0) paramsPatch[slot] = entry
        }
      }
    }
  }

  if (Object.keys(patch).length === 0 && Object.keys(paramsPatch).length === 0) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Aucun modèle ni paramètre valide fourni.' } },
      { status: 400 },
    )
  }

  try {
    // Les modèles sont validés contre l'allowlist ; les params sont CLAMPÉS (jamais rejetés).
    const config = Object.keys(patch).length > 0 ? await setLlmConfig(patch, session.cjsUid) : await getLlmConfig()
    if (Object.keys(paramsPatch).length > 0) await setLlmParams(paramsPatch, session.cjsUid)
    const params = await allParams()
    await recordAudit(session.cjsUid, 'llm.config.update', {
      targetType: 'llm_config',
      targetId: 'default',
      meta: { ...patch, params: paramsPatch },
    })
    return NextResponse.json({ data: { config, params } })
  } catch (err) {
    // Modèle hors allowlist / incompatible avec le slot.
    return NextResponse.json(
      { error: { code: 'INVALID_MODEL', message: err instanceof Error ? err.message : 'Modèle invalide.' } },
      { status: 400 },
    )
  }
}
