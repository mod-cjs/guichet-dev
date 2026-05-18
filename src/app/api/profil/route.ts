import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Region, Genre } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { calculerScore } from '@/lib/profil-score'
import { loadProfilComplet } from '@/lib/profil-loader'
import type { ApiResponse } from '@/types/api'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

// ── Schéma PUT ────────────────────────────────────────────────────────────────

const REGIONS = Object.values(Region) as [string, ...string[]]
const GENRES  = Object.values(Genre)  as [string, ...string[]]

const PutProfilSchema = z.object({
  region:           z.enum(REGIONS).optional().nullable(),
  commune:          z.string().max(100).optional().nullable(),
  genre:            z.enum(GENRES).optional().nullable(),
  dateNaissance:    z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(d => {
      const date = new Date(d)
      return date < new Date() && date > new Date('1900-01-01')
    }, 'Date de naissance invalide')
    .optional().nullable(),
  biographie:       z.string().max(2000).optional().nullable(),
  niveauEtude:      z.string().max(50).optional().nullable(),
  situationEmploi:  z.string().max(50).optional().nullable(),
  domainesInteret:  z.array(z.string()).max(10).optional(),
  competences:      z.array(z.string().max(80)).max(20).optional(),
  profileVisibility: z.enum(['public', 'prive']).optional(),
})

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

  // Lire état actuel + count expériences pour calculer le score avant transaction
  const [existing, expCount] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { cjsUid: session.cjsUid },
      select: {
        region: true, commune: true, genre: true, dateNaissance: true,
        profil: { select: { biographie: true, niveauEtude: true, situationEmploi: true, domainesInteret: true, competences: true } },
      },
    }),
    prisma.experience.count({ where: { profil: { cjsUid: session.cjsUid } } }),
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
  const score = calculerScore(mergedIdentite, mergedProfil, expCount)

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
    ...(profilFields.domainesInteret   !== undefined ? { domainesInteret: profilFields.domainesInteret }     : {}),
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
    domainesInteret: mergedProfil.domainesInteret,
    competences:     mergedProfil.competences,
    completionScore: score,
  }

  return NextResponse.json({ data: responseData })
}
