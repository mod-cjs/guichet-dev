// GUIC-537 — API admin de configuration du modèle LLM (Vertex) par usage.
// GET  : config effective + allowlist. PUT : met à jour les slots fournis (validés).
// RBAC admin. Toute écriture est journalisée (journal d'audit).

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { recordAudit } from '@/lib/audit'
import { getLlmConfig, setLlmConfig } from '@/lib/ia/llm-config'
import { SUPPORTED_MODELS, type LlmSlot } from '@/lib/ia/supported-models'

const SLOTS: readonly LlmSlot[] = ['agent', 'judge', 'adequation']

function forbidden() {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
    { status: 403 },
  )
}

export async function GET() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) return forbidden()

  const config = await getLlmConfig()
  return NextResponse.json({ data: { config, models: SUPPORTED_MODELS } })
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
  if (body && typeof body === 'object') {
    for (const slot of SLOTS) {
      const v = (body as Record<string, unknown>)[slot]
      if (typeof v === 'string' && v.trim()) patch[slot] = v.trim()
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Aucun modèle valide fourni.' } },
      { status: 400 },
    )
  }

  try {
    const config = await setLlmConfig(patch, session.cjsUid)
    await recordAudit(session.cjsUid, 'llm.config.update', {
      targetType: 'llm_config',
      targetId: 'default',
      meta: patch,
    })
    return NextResponse.json({ data: { config } })
  } catch (err) {
    // Modèle hors allowlist / incompatible avec le slot.
    return NextResponse.json(
      { error: { code: 'INVALID_MODEL', message: err instanceof Error ? err.message : 'Modèle invalide.' } },
      { status: 400 },
    )
  }
}
