import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { LangueSchema, MAX_LANGUES } from '@/lib/profil-schemas'
import type { ApiResponse } from '@/types/api'
import type { LangueItem } from '@/types/profil'

/**
 * GUIC-689 — Langues déclarées par le jeune (carte « Compétences & langues »).
 *
 * Pas de recalcul du score : les langues ne comptent pas dans le barème de
 * complétion. Elles servent au matching, pas à la progression — les mêler
 * ferait bouger le score de tous les profils existants.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<LangueItem>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `langue-post:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<LangueItem>>

  const body = await request.json().catch(() => null)
  const parsed = LangueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const count = await prisma.langueProfil.count({ where: { profil: { cjsUid: session.cjsUid } } })
  if (count >= MAX_LANGUES) {
    return NextResponse.json(
      { error: { code: 'LIMIT_REACHED', message: `Maximum ${MAX_LANGUES} langues atteint` } },
      { status: 422 },
    )
  }

  const profil = await prisma.profilJeune.upsert({
    where:  { cjsUid: session.cjsUid },
    create: { cjsUid: session.cjsUid },
    update: {},
    select: { id: true },
  })

  try {
    const langue = await prisma.langueProfil.create({
      data: { profilId: profil.id, langue: parsed.data.langue, niveau: parsed.data.niveau },
      select: { id: true, langue: true, niveau: true },
    })
    return NextResponse.json({ data: langue }, { status: 201 })
  } catch {
    // Contrainte `(profil, langue)` : on rend un message lisible plutôt qu'une
    // erreur de base brute. Déclarer deux fois la même langue est une maladresse
    // d'usage, pas une panne.
    return NextResponse.json(
      { error: { code: 'DEJA_DECLAREE', message: 'Cette langue est déjà déclarée' } },
      { status: 409 },
    )
  }
}
