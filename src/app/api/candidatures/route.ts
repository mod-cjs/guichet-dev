import { NextRequest, NextResponse, after } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, extractIp } from '@/lib/rate-limit'
import { logger, hashId } from '@/lib/logger'
import { CandidatureBodySchema } from '@/lib/validations/candidature'
import { checkProfilCompletude } from '@/lib/profil-completude'
import { notifyCandidatureConfirmee } from '@/lib/notifications'
import { notifyRecruteurNouvelleCandidature } from '@/lib/notifications/recruteur'
import { computeScoreAdequation } from '@/lib/recruteur/adequation'
import { fireBeneficiaireGraphSync } from '@/lib/ia/graph/fire-sync'
import type { ApiResponse } from '@/types/api'
import type { CandidatureListItem } from '@/types/candidature'

/** Version courante des CGU acceptées au moment du POST candidature. */
const CGU_VERSION = 'v1.0'

// GUIC-21 — M3 · Candidatures (auth SSO requise).

const PAGE_SIZE = 20
const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

/** GET /api/candidatures — candidatures de l'utilisateur connecté, paginées. */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<CandidatureListItem[]>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `candidatures-get:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<CandidatureListItem[]>>

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1)

  const [rows, total] = await Promise.all([
    prisma.candidature.findMany({
      where: { cjsUid: session.cjsUid },
      orderBy: { soumiseA: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        statut: true,
        soumiseA: true,
        opportunite: { select: { slug: true, titre: true, organisation: true } },
      },
    }),
    prisma.candidature.count({ where: { cjsUid: session.cjsUid } }),
  ])

  const data: CandidatureListItem[] = rows.map((c) => ({
    id: c.id,
    opportuniteSlug: c.opportunite.slug,
    opportuniteTitre: c.opportunite.titre,
    organisation: c.opportunite.organisation,
    statut: c.statut,
    soumiseA: c.soumiseA.toISOString(),
  }))

  // Cache-Control: 'private, no-store' — données personnelles (CDP).
  return NextResponse.json(
    { data, meta: { total, page, limit: PAGE_SIZE } },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}

/** POST /api/candidatures — soumet une candidature ; 409 si doublon. */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 10,
    keyPrefix: `candidatures-post:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse>

  const body = await request.json().catch(() => null)
  const parsed = CandidatureBodySchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const field = first?.path?.join('.') ?? 'inconnu'
    const detail = first?.message ?? 'Données invalides'
    // Log détaillé côté serveur — visible dans Vercel Logs pour debug
    logger.warn('[candidatures POST] validation échouée', {
      field,
      detail,
      issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
    })
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `${field} : ${detail}`,
        },
      },
      { status: 400 },
    )
  }

  // GUIC-232 — profil de base obligatoire pour candidater.
  const completude = await checkProfilCompletude(session.cjsUid, {
    prenom: session.prenom,
    nom: session.nom,
    email: session.email,
    telephone: session.telephone,
    region: session.region,
  })
  if (!completude.complet) {
    return NextResponse.json(
      {
        error: {
          code: 'PROFILE_INCOMPLETE',
          message: `Complétez votre profil : ${completude.missing.join(', ')}`,
          missing: completude.missing,
        },
      },
      { status: 403 },
    )
  }

  const opportunite = await prisma.opportunite.findUnique({
    where: { id: parsed.data.opportuniteId },
    select: { id: true, titre: true, organisation: true, statut: true, deletedAt: true, deadline: true },
  })
  if (!opportunite || opportunite.deletedAt) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Opportunité introuvable' } },
      { status: 404 },
    )
  }
  const expiree = opportunite.deadline !== null && opportunite.deadline < new Date()
  if (opportunite.statut !== 'publiee' || expiree) {
    return NextResponse.json(
      {
        error: {
          code: 'OPPORTUNITE_FERMEE',
          message: 'Cette opportunité n’accepte plus de candidatures',
        },
      },
      { status: 422 },
    )
  }

  // Traçabilité du consentement CGU (audit CDP / GUIC-218).
  const consentIp = extractIp(request)

  let candidature
  try {
    candidature = await prisma.candidature.create({
      data: {
        cjsUid: session.cjsUid,
        opportuniteId: opportunite.id,
        lettreMotivation: parsed.data.lettreMotivation,
        cvUrl: parsed.data.cvUrl ?? null,
        // GUIC-361 — snapshot des infos profil au moment de la candidature.
        notificationsConsent: parsed.data.notificationsConsent,
        consentAt: new Date(),
        cguVersion: CGU_VERSION,
        consentIp,
      },
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: { code: 'ALREADY_APPLIED', message: 'Vous avez déjà postulé à cette opportunité' } },
        { status: 409 },
      )
    }
    throw err
  }

  // GUIC-382 — purge le brouillon associé après création réussie de la
  // candidature (best-effort, non-bloquant).
  await prisma.candidatureDraft
    .delete({
      where: {
        cjsUid_opportuniteId: {
          cjsUid: session.cjsUid,
          opportuniteId: opportunite.id,
        },
      },
    })
    .catch(() => null)

  // Confirmation multi-canal — post-réponse, n'impacte jamais le 201.
  const created = candidature
  after(async () => {
    // Fraîcheur du Knowledge Graph : l'arête A_POSTULE doit exister AVANT la prochaine
    // recommandation, sinon Yaye re-propose l'offre à laquelle il vient de postuler.
    fireBeneficiaireGraphSync(session.cjsUid)
    try {
      await notifyCandidatureConfirmee(
        {
          eventId: `candidature:${created.id}`,
          prenom: session.prenom,
          telephone: session.telephone,
          opportuniteTitre: opportunite.titre,
          organisation: opportunite.organisation,
        },
        parsed.data.notificationsConsent,
      )
      // GUIC-488 — notifie le recruteur (in-app) de la nouvelle candidature.
      await notifyRecruteurNouvelleCandidature(
        opportunite.id,
        `${session.prenom ?? ''} ${session.nom ?? ''}`.trim() || 'Un candidat',
      )
      // GUIC-487 — calcule le score d'adéquation (IA Groq) en tâche de fond.
      await computeScoreAdequation(created.id)
    } catch (err) {
      logger.error('[candidatures] dispatch des notifications échoué', { err })
    }
  })

  logger.info('[candidatures] créée', {
    cjsUidHash: hashId(session.cjsUid),
    candidatureId: candidature.id,
  })

  return NextResponse.json({ data: candidature }, { status: 201 })
}
