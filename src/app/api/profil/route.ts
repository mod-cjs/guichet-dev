import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfilComplet {
  cjsUid:          string
  nom:             string
  prenom:          string
  email:           string | null
  telephone:       string | null
  region:          string | null
  commune:         string | null
  genre:           string | null
  dateNaissance:   string | null
  profil: {
    id:              string
    biographie:      string | null
    niveauEtude:     string | null
    situationEmploi: string | null
    domainesInteret: string[]
    competences:     string[]
    completionScore: number
    profileVisibility: string
  } | null
  experiences: {
    id:           string
    poste:        string
    organisation: string
    dateDebut:    string
    dateFin:      string | null
    description:  string | null
  }[]
  certificats: {
    id:            string
    formation:     string
    obtenuLe:      string
    urlCertificat: string | null
  }[]
}

// ── Score ─────────────────────────────────────────────────────────────────────

function calculerScore(
  u: { region: unknown; genre: unknown; dateNaissance: unknown; commune: unknown },
  p: { biographie: unknown; niveauEtude: unknown; situationEmploi: unknown; domainesInteret: unknown; competences: unknown } | null,
  experiencesCount: number,
): number {
  let s = 0
  if (u.region)                                            s += 10
  if (u.genre)                                             s += 5
  if (u.dateNaissance)                                     s += 5
  if (u.commune)                                           s += 5
  if (p?.biographie)                                       s += 20
  if (p?.niveauEtude)                                      s += 10
  if (p?.situationEmploi)                                  s += 10
  if (Array.isArray(p?.domainesInteret) && (p?.domainesInteret as unknown[]).length > 0) s += 15
  if (Array.isArray(p?.competences)     && (p?.competences as unknown[]).length > 0)     s += 10
  if (experiencesCount > 0)                                s += 10
  return Math.min(s, 100)
}

// ── Schéma de validation PUT ──────────────────────────────────────────────────

const PutProfilSchema = z.object({
  region:          z.string().optional().nullable(),
  commune:         z.string().max(100).optional().nullable(),
  genre:           z.enum(['M', 'F']).optional().nullable(),
  dateNaissance:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  biographie:      z.string().max(2000).optional().nullable(),
  niveauEtude:     z.string().max(50).optional().nullable(),
  situationEmploi: z.string().max(50).optional().nullable(),
  domainesInteret: z.array(z.string()).max(10).optional(),
  competences:     z.array(z.string().max(80)).max(20).optional(),
  profileVisibility: z.enum(['public', 'prive']).optional(),
})

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ProfilComplet>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 30, keyPrefix: 'profil-get' })
  if (limited) return limited as NextResponse<ApiResponse<ProfilComplet>>

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { cjsUid: session.cjsUid },
    select: {
      cjsUid: true, nom: true, prenom: true, email: true, telephone: true,
      region: true, commune: true, genre: true, dateNaissance: true,
      profil: {
        select: {
          id: true, biographie: true, niveauEtude: true, situationEmploi: true,
          domainesInteret: true, competences: true, completionScore: true, profileVisibility: true,
          experiences: {
            select: { id: true, poste: true, organisation: true, dateDebut: true, dateFin: true, description: true },
            orderBy: { dateDebut: 'desc' },
          },
          certificats: {
            select: { id: true, formation: true, obtenuLe: true, urlCertificat: true },
            orderBy: { obtenuLe: 'desc' },
          },
        },
      },
    },
  })

  if (!utilisateur) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } }, { status: 404 })

  const profil = utilisateur.profil

  const data: ProfilComplet = {
    cjsUid:        utilisateur.cjsUid,
    nom:           utilisateur.nom,
    prenom:        utilisateur.prenom,
    email:         utilisateur.email,
    telephone:     utilisateur.telephone,
    region:        utilisateur.region,
    commune:       utilisateur.commune,
    genre:         utilisateur.genre,
    dateNaissance: utilisateur.dateNaissance?.toISOString().slice(0, 10) ?? null,
    profil: profil ? {
      id:                profil.id,
      biographie:        profil.biographie,
      niveauEtude:       profil.niveauEtude,
      situationEmploi:   profil.situationEmploi,
      domainesInteret:   (profil.domainesInteret as string[] | null) ?? [],
      competences:       (profil.competences as string[] | null) ?? [],
      completionScore:   profil.completionScore,
      profileVisibility: profil.profileVisibility,
    } : null,
    experiences: (profil?.experiences ?? []).map(e => ({
      id:           e.id,
      poste:        e.poste,
      organisation: e.organisation,
      dateDebut:    e.dateDebut.toISOString().slice(0, 10),
      dateFin:      e.dateFin?.toISOString().slice(0, 10) ?? null,
      description:  e.description,
    })),
    certificats: (profil?.certificats ?? []).map(c => ({
      id:            c.id,
      formation:     c.formation,
      obtenuLe:      c.obtenuLe.toISOString().slice(0, 10),
      urlCertificat: c.urlCertificat,
    })),
  }

  return NextResponse.json({ data })
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<{ completionScore: number }>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: 'profil-put' })
  if (limited) return limited as NextResponse<ApiResponse<{ completionScore: number }>>

  const body = await request.json().catch(() => null)
  const parsed = PutProfilSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const { region, commune, genre, dateNaissance, ...profilFields } = parsed.data

  // Mettre à jour Utilisateur
  const utilisateur = await prisma.utilisateur.update({
    where: { cjsUid: session.cjsUid },
    data: {
      ...(region !== undefined        ? { region: region as never }           : {}),
      ...(commune !== undefined       ? { commune }                           : {}),
      ...(genre !== undefined         ? { genre: genre as never }             : {}),
      ...(dateNaissance !== undefined ? { dateNaissance: dateNaissance ? new Date(dateNaissance) : null } : {}),
    },
    select: { region: true, commune: true, genre: true, dateNaissance: true },
  })

  // Upsert ProfilJeune
  const profil = await prisma.profilJeune.upsert({
    where: { cjsUid: session.cjsUid },
    create: {
      cjsUid: session.cjsUid,
      ...buildProfilData(profilFields),
    },
    update: buildProfilData(profilFields),
    select: {
      biographie: true, niveauEtude: true, situationEmploi: true,
      domainesInteret: true, competences: true,
      experiences: { select: { id: true } },
    },
  })

  const score = calculerScore(utilisateur, profil, profil.experiences.length)

  await prisma.profilJeune.update({
    where: { cjsUid: session.cjsUid },
    data: { completionScore: score },
  })

  return NextResponse.json({ data: { completionScore: score } })
}

function buildProfilData(fields: Omit<z.infer<typeof PutProfilSchema>, 'region' | 'commune' | 'genre' | 'dateNaissance'>) {
  return {
    ...(fields.biographie      !== undefined ? { biographie: fields.biographie }           : {}),
    ...(fields.niveauEtude     !== undefined ? { niveauEtude: fields.niveauEtude }         : {}),
    ...(fields.situationEmploi !== undefined ? { situationEmploi: fields.situationEmploi } : {}),
    ...(fields.domainesInteret !== undefined ? { domainesInteret: fields.domainesInteret } : {}),
    ...(fields.competences     !== undefined ? { competences: fields.competences }         : {}),
    ...(fields.profileVisibility !== undefined ? { profileVisibility: fields.profileVisibility } : {}),
  }
}
