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
import { getFlags, setFlags } from '@/lib/flags'
import { getFlagHits } from '@/lib/flags/metrics'
import { canManageFlags, canViewFlags } from '@/lib/flags/rbac'
import { FEATURE_FLAGS, getFlagDef } from '@/lib/flags/catalog'
import { cascade } from '@/lib/flags/cascade'
import { compteEngagements } from '@/lib/flags/engagements'
import { purgerCacheSitemap } from '@/lib/seo/sitemap'
import { revalidatePath } from 'next/cache'
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

  // Séquence à appliquer pour amener une fonctionnalité à l'état voulu, SANS l'appliquer.
  // Le panneau s'en sert pour annoncer ce qui va basculer avant de demander confirmation :
  // un refus sec dit ce qui bloque, il ne dit pas comment faire.
  const cascadeKey = request?.nextUrl.searchParams.get('cascade')
  if (cascadeKey) {
    const vise = request!.nextUrl.searchParams.get('enabled') !== 'false'
    const cles = cascade(cascadeKey, vise).filter((k) => flags[k] !== vise)
    // Le décompte n'a de sens qu'à la fermeture : à l'ouverture, rien n'est en cours.
    // Sans lui, l'administrateur bascule à l'aveugle sur un module où des gens attendent
    // quelque chose — un livre chez eux, un créneau réservé, un dossier en instruction.
    const sequence = await Promise.all(
      cles.map(async (k) => ({
        key: k,
        label: getFlagDef(k)?.label ?? k,
        engagements: vise ? 0 : await compteEngagements(k),
        engagementsLabel: getFlagDef(k)?.engagements?.label ?? null,
      })),
    )
    return NextResponse.json({ data: { sequence, enabled: vise } })
  }

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

  const enCascade = champs.cascade === true
  const courant = await getFlags()

  if (!key || typeof enabled !== 'boolean') {
    return refus('Requête invalide : `key` (texte) et `enabled` (booléen) sont requis.', 400)
  }

  // Une séquence complète est appliquée d'un bloc — atomique, et journalisée UNE fois :
  // cinq lignes d'audit séparées seraient à recoller après coup lors d'une analyse.
  const sequence = enCascade ? cascade(key, enabled).filter((k) => courant[k] !== enabled) : [key]

  let flags: Record<string, boolean>
  try {
    flags = await setFlags(
      sequence.map((k) => ({ key: k, enabled })),
      { updatedBy: session.cjsUid, note },
    )
  } catch (err) {
    // Clé inconnue, flag verrouillé, dépendance masquée : erreurs de demande, pas pannes.
    // Un 500 les ferait passer pour un incident d'infrastructure.
    return refus(err instanceof Error ? err.message : 'Bascule refusée.', 400)
  }

  // GUIC-706 — le sitemap a DEUX caches : Redis 1 h et l'ISR de Next (revalidate 3600).
  // Sans purge des deux, une fonctionnalité masquée resterait annoncée aux moteurs jusqu'à
  // deux heures, alors que tout le reste bascule en quelques secondes.
  await purgerCacheSitemap()
  revalidatePath('/sitemap.xml')

  await recordAudit(session.cjsUid, 'feature.flag.update', {
    targetType: 'feature_flag',
    targetId: key,
    meta: { enabled, note: note ?? null, sequence },
  })

  return NextResponse.json({ data: { flags } })
}
