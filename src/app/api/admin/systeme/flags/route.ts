// GUIC-706 — API d'administration des fonctionnalités.
//
// GET  : état effectif + catalogue + compteurs de refus (+ `?format=export`).
// PUT  : bascule d'une fonctionnalité, journalisée.
//
// La lecture est ouverte à toute l'administration, l'écriture à l'administration
// nationale seule (`src/lib/flags/rbac.ts`). Toute la validation métier vit dans
// `setFlag` : la route ne fait que traduire ses refus en 400.

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { getFlags, setFlag } from '@/lib/flags'
import { getFlagHits } from '@/lib/flags/metrics'
import { canManageFlags, canViewFlags } from '@/lib/flags/rbac'
import { FEATURE_FLAGS } from '@/lib/flags/catalog'
import type { ApiResponse } from '@/types/api'

function refus(message: string, status: 400 | 403) {
  return NextResponse.json<ApiResponse<never>>(
    { error: { code: status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message } },
    { status },
  )
}

export async function GET(request?: NextRequest) {
  const session = await getSession()
  if (!session || !canViewFlags(session.roles)) {
    return refus('Accès réservé à l’administration.', 403)
  }

  const flags = await getFlags()

  // Instantané plat, réimportable : c'est ce qui permet de rejouer en production une
  // configuration éprouvée en recette, et de capturer l'état avant une bascule d'incident.
  if (request?.nextUrl.searchParams.get('format') === 'export') {
    return NextResponse.json({ data: { flags, exportedAt: new Date().toISOString() } })
  }

  return NextResponse.json({
    data: {
      flags,
      catalogue: FEATURE_FLAGS,
      hits: await getFlagHits(FEATURE_FLAGS.map((f) => f.key)),
      // Sans ce drapeau, l'interface afficherait des toggles actifs à un modérateur, qui
      // se heurterait à un 403 après coup.
      canManage: canManageFlags(session.roles),
    },
  })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || !canManageFlags(session.roles)) {
    return refus('Seule l’administration nationale peut modifier l’ouverture des fonctionnalités.', 403)
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    /* corps illisible → rejeté plus bas comme une demande invalide */
  }

  const champs = (body ?? {}) as Record<string, unknown>
  const key = typeof champs.key === 'string' ? champs.key.trim() : ''
  const enabled = champs.enabled
  const note = typeof champs.note === 'string' && champs.note.trim() ? champs.note.trim() : undefined

  if (!key || typeof enabled !== 'boolean') {
    return refus('Requête invalide : `key` (texte) et `enabled` (booléen) sont requis.', 400)
  }

  let flags: Record<string, boolean>
  try {
    flags = await setFlag(key, enabled, { updatedBy: session.cjsUid, note })
  } catch (err) {
    // Clé inconnue, flag verrouillé, dépendance masquée : erreurs de demande, pas pannes.
    // Un 500 les ferait passer pour un incident d'infrastructure.
    return refus(err instanceof Error ? err.message : 'Bascule refusée.', 400)
  }

  await recordAudit(session.cjsUid, 'feature.flag.update', {
    targetType: 'feature_flag',
    targetId: key,
    meta: { enabled, note: note ?? null },
  })

  return NextResponse.json({ data: { flags } })
}
