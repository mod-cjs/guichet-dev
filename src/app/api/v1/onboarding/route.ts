import { NextRequest, NextResponse } from 'next/server'
import { getSession, encodeSession, setSessionCookie } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { calculerScore } from '@/lib/profil-score'
import {
  stepIdentiteSchema,
  stepLocalisationSchema,
  stepProfilSchema,
} from '@/lib/validations/onboarding'
import type { ApiResponse } from '@/types/api'
import { Genre, type Region } from '@prisma/client'
import { z } from 'zod'

// ── GET — récupérer les données existantes pour pré-remplissage ───────────

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 30, keyPrefix: 'onboarding-get' })
  if (limited) return limited

  const session = await getSession(request)
  if (!session) return unauthorized()

  const utilisateur = await prisma.utilisateur.findUnique({
    where:  { cjsUid: session.cjsUid },
    select: {
      nom: true, prenom: true, dateNaissance: true, genre: true,
      region: true, commune: true,
      profil: {
        select: { niveauEtude: true, situationEmploi: true, domainesInteret: true },
      },
    },
  })

  if (!utilisateur) return notFound()

  const profil = utilisateur.profil

  const data = {
    identite: {
      nom:           utilisateur.nom,
      prenom:        utilisateur.prenom,
      dateNaissance: utilisateur.dateNaissance
        ? utilisateur.dateNaissance.toISOString().slice(0, 10)
        : null,
      genre: utilisateur.genre ?? null,
    },
    localisation: {
      region:  utilisateur.region ?? null,
      commune: utilisateur.commune ?? null,
    },
    profil: {
      niveauEtude:     profil?.niveauEtude     ?? null,
      situationEmploi: profil?.situationEmploi ?? null,
      domainesInteret: (profil?.domainesInteret as string[] | null) ?? [],
    },
  }

  return NextResponse.json<ApiResponse<typeof data>>({ data })
}

// ── PUT — sauvegarder une étape ───────────────────────────────────────────

const putBodySchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal(1), data: stepIdentiteSchema }),
  z.object({ step: z.literal(2), data: stepLocalisationSchema }),
  z.object({ step: z.literal(3), data: stepProfilSchema }),
])

export async function PUT(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: 'onboarding-put' })
  if (limited) return limited

  const session = await getSession(request)
  if (!session) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'BAD_REQUEST', message: 'JSON invalide' } },
      { status: 400 }
    )
  }

  const parsed = putBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 422 }
    )
  }

  const { step, data } = parsed.data

  if (step === 1) {
    await prisma.utilisateur.update({
      where: { cjsUid: session.cjsUid },
      data: {
        nom:           data.nom,
        prenom:        data.prenom,
        dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
        genre:         (data.genre as Genre) ?? null,
      },
    })

    // Synchroniser le JWT — nom/prénom peuvent avoir été vides au login (SSO sans last_name)
    const updatedSession = { ...session, nom: data.nom, prenom: data.prenom }
    const encoded        = await encodeSession(updatedSession)
    const response       = NextResponse.json<ApiResponse<{ nextStep: number; onboardingComplete: boolean }>>({
      data: { nextStep: 2, onboardingComplete: false },
    })
    setSessionCookie(response, encoded, updatedSession.expiresAt - Math.floor(Date.now() / 1000))
    return response
  }

  if (step === 2) {
    await prisma.utilisateur.update({
      where: { cjsUid: session.cjsUid },
      data: {
        region:  data.region as Region,
        commune: data.commune ?? null,
      },
    })

    return NextResponse.json<ApiResponse<{ nextStep: number; onboardingComplete: boolean }>>({
      data: { nextStep: 3, onboardingComplete: false },
    })
  }

  // step === 3 — complétion finale
  // Lire l'identité déjà sauvegardée (steps 1+2) pour calculer le score initial
  const identiteExistante = await prisma.utilisateur.findUnique({
    where:  { cjsUid: session.cjsUid },
    select: { region: true, commune: true, genre: true, dateNaissance: true },
  })

  const score = calculerScore(
    {
      region:        identiteExistante?.region        ?? null,
      commune:       identiteExistante?.commune       ?? null,
      genre:         identiteExistante?.genre         ?? null,
      dateNaissance: identiteExistante?.dateNaissance ?? null,
    },
    {
      biographie:      null,
      niveauEtude:     data.niveauEtude     ?? null,
      situationEmploi: data.situationEmploi ?? null,
      domainesInteret: data.domainesInteret ?? [],
      competences:     [],
    },
    0,
  )

  await prisma.$transaction(async (tx) => {
    await tx.profilJeune.upsert({
      where:  { cjsUid: session.cjsUid },
      update: {
        niveauEtude:     data.niveauEtude     ?? null,
        situationEmploi: data.situationEmploi ?? null,
        domainesInteret: data.domainesInteret ?? [],
        completionScore: score,
      },
      create: {
        cjsUid:          session.cjsUid,
        niveauEtude:     data.niveauEtude     ?? null,
        situationEmploi: data.situationEmploi ?? null,
        domainesInteret: data.domainesInteret ?? [],
        completionScore: score,
      },
    })

    await tx.utilisateur.update({
      where: { cjsUid: session.cjsUid },
      data:  { onboardingComplete: true },
    })
  })

  // Mettre à jour la session cookie
  const updatedSession = { ...session, onboardingComplete: true }
  const encoded        = await encodeSession(updatedSession)
  const response       = NextResponse.json<ApiResponse<{ nextStep: null; onboardingComplete: boolean }>>({
    data: { nextStep: null, onboardingComplete: true },
  })
  setSessionCookie(response, encoded, updatedSession.expiresAt - Math.floor(Date.now() / 1000))
  return response
}

// ── Helpers ───────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json<ApiResponse>(
    { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
    { status: 401 }
  )
}

function notFound() {
  return NextResponse.json<ApiResponse>(
    { error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } },
    { status: 404 }
  )
}
