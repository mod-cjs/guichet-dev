import { NextRequest, NextResponse } from 'next/server'
import { Region, Genre, Handicap, ZoneHabitation } from '@prisma/client'
import { PutProfilSchema } from './schema'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { calculerScore } from '@/lib/profil-score'
import { loadProfilComplet } from '@/lib/profil-loader'
import { fireBeneficiaireGraphSync } from '@/lib/ia/graph/fire-sync'
import type { ApiResponse } from '@/types/api'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

// ── Schéma PUT — extrait dans `./schema.ts` pour être testable seul (GUIC-689).

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ProfilComplet>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 30, keyPrefix: 'profil-get' })
  if (limited) return limited as NextResponse<ApiResponse<ProfilComplet>>

  const data = await loadProfilComplet(session.cjsUid)
  if (!data) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } }, { status: 404 })

  return NextResponse.json({ data })
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<PutProfilResponse>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  // Rate limit par utilisateur (pas par IP — évite blocage derrière NAT partagé)
  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `profil-put:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<PutProfilResponse>>

  const body = await request.json().catch(() => null)
  const parsed = PutProfilSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const { region, commune, genre, dateNaissance, ...profilFields } = parsed.data

  // Lire état actuel + count expériences + count diplômes pour calculer le score avant transaction
  const [existing, expCount, diplomeCount] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { cjsUid: session.cjsUid },
      select: {
        region: true, commune: true, genre: true, dateNaissance: true,
        profil: { select: { biographie: true, niveauEtude: true, situationEmploi: true, situationHandicap: true, zoneHabitation: true, domainesInteret: true, competences: true } },
      },
    }),
    prisma.experience.count({ where: { profil: { cjsUid: session.cjsUid } } }),
    prisma.diplome.count({ where: { profil: { cjsUid: session.cjsUid } } }),
  ])

  // Fusionner état actuel + champs soumis pour le calcul du score
  const mergedIdentite = {
    region:        region        !== undefined ? region        : existing?.region        ?? null,
    commune:       commune       !== undefined ? commune       : existing?.commune       ?? null,
    genre:         genre         !== undefined ? genre         : existing?.genre         ?? null,
    dateNaissance: dateNaissance !== undefined ? dateNaissance : existing?.dateNaissance ?? null,
  }
  const mergedProfil = {
    biographie:      profilFields.biographie      !== undefined ? profilFields.biographie      : existing?.profil?.biographie      ?? null,
    niveauEtude:     profilFields.niveauEtude     !== undefined ? profilFields.niveauEtude     : existing?.profil?.niveauEtude     ?? null,
    situationEmploi: profilFields.situationEmploi !== undefined ? profilFields.situationEmploi : existing?.profil?.situationEmploi ?? null,
    domainesInteret: profilFields.domainesInteret !== undefined ? profilFields.domainesInteret : (existing?.profil?.domainesInteret as string[] | null) ?? [],
    competences:     profilFields.competences     !== undefined ? profilFields.competences     : (existing?.profil?.competences as string[] | null) ?? [],
  }
  const score = calculerScore(mergedIdentite, mergedProfil, expCount, diplomeCount)

  // GUIC-660 — champs inclusion : hors calcul de score, mais fusionnés pour la réponse.
  const mergedInclusion = {
    situationHandicap: profilFields.situationHandicap !== undefined ? profilFields.situationHandicap : existing?.profil?.situationHandicap ?? null,
    zoneHabitation:    profilFields.zoneHabitation    !== undefined ? profilFields.zoneHabitation    : existing?.profil?.zoneHabitation    ?? null,
  }

  // Construire les données à persister
  const identiteData = {
    ...(region        !== undefined ? { region: region as Region | null }             : {}),
    ...(commune       !== undefined ? { commune }                                     : {}),
    ...(genre         !== undefined ? { genre: genre as Genre | null }                : {}),
    ...(dateNaissance !== undefined ? { dateNaissance: dateNaissance ? new Date(dateNaissance) : null } : {}),
  }
  const profilData = {
    ...(profilFields.biographie        !== undefined ? { biographie: profilFields.biographie }               : {}),
    ...(profilFields.niveauEtude       !== undefined ? { niveauEtude: profilFields.niveauEtude }             : {}),
    ...(profilFields.situationEmploi   !== undefined ? { situationEmploi: profilFields.situationEmploi }     : {}),
    ...(profilFields.situationHandicap !== undefined ? { situationHandicap: profilFields.situationHandicap as Handicap | null }     : {}),
    ...(profilFields.zoneHabitation    !== undefined ? { zoneHabitation: profilFields.zoneHabitation as ZoneHabitation | null }    : {}),
    ...(profilFields.domainesInteret   !== undefined ? { domainesInteret: profilFields.domainesInteret }     : {}),
    ...(profilFields.objectif          !== undefined ? { objectif: profilFields.objectif }                   : {}),
    ...(profilFields.typesRecherches   !== undefined ? { typesRecherches: profilFields.typesRecherches }     : {}),
    ...(profilFields.regionsMobilite   !== undefined ? { regionsMobilite: profilFields.regionsMobilite }     : {}),
    ...(profilFields.competences       !== undefined ? { competences: profilFields.competences }             : {}),
    ...(profilFields.profileVisibility !== undefined ? { profileVisibility: profilFields.profileVisibility } : {}),
  }

  // Transaction atomique : 0 mise à jour partielle possible
  await prisma.$transaction(async (tx) => {
    if (Object.keys(identiteData).length > 0) {
      await tx.utilisateur.update({ where: { cjsUid: session.cjsUid }, data: identiteData })
    }
    await tx.profilJeune.upsert({
      where:  { cjsUid: session.cjsUid },
      create: { cjsUid: session.cjsUid, ...profilData, completionScore: score },
      update: { ...profilData, completionScore: score },
    })
  })

  // Retourner l'état fusionné complet pour que le client puisse mettre à jour son affichage
  const responseData: PutProfilResponse = {
    region:          mergedIdentite.region,
    commune:         mergedIdentite.commune,
    genre:           mergedIdentite.genre,
    dateNaissance:   typeof mergedIdentite.dateNaissance === 'string'
      ? mergedIdentite.dateNaissance
      : (mergedIdentite.dateNaissance as Date | null)?.toISOString().slice(0, 10) ?? null,
    biographie:      mergedProfil.biographie,
    niveauEtude:     mergedProfil.niveauEtude,
    situationEmploi: mergedProfil.situationEmploi,
    situationHandicap: mergedInclusion.situationHandicap,
    zoneHabitation:    mergedInclusion.zoneHabitation,
    domainesInteret: mergedProfil.domainesInteret,
    competences:     mergedProfil.competences,
    completionScore: score,
  }

  // Fraîcheur du Knowledge Graph : compétences (MAITRISE), niveau d'étude et région
  // pilotent l'éligibilité et l'écart de compétences → à reprojeter tout de suite.
  fireBeneficiaireGraphSync(session.cjsUid)

  return NextResponse.json({ data: responseData })
}
