import { prisma } from '@/lib/prisma'
import { calculerScore } from '@/lib/profil-score'
import type { ProfilComplet } from '@/types/profil'

export async function recalculerEtPersisterScore(cjsUid: string): Promise<number> {
  const [utilisateur, expCount] = await Promise.all([
    prisma.utilisateur.findUnique({
      where:  { cjsUid },
      select: {
        region: true, commune: true, genre: true, dateNaissance: true,
        profil: {
          select: { biographie: true, niveauEtude: true, situationEmploi: true, domainesInteret: true, competences: true },
        },
      },
    }),
    prisma.experience.count({ where: { profil: { cjsUid } } }),
  ])

  const score = calculerScore(
    {
      region:        utilisateur?.region        ?? null,
      commune:       utilisateur?.commune       ?? null,
      genre:         utilisateur?.genre         ?? null,
      dateNaissance: utilisateur?.dateNaissance ?? null,
    },
    utilisateur?.profil ?? null,
    expCount,
  )

  await prisma.profilJeune.update({ where: { cjsUid }, data: { completionScore: score } })
  return score
}

export async function loadProfilComplet(cjsUid: string): Promise<ProfilComplet | null> {
  const u = await prisma.utilisateur.findUnique({
    where: { cjsUid },
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

  if (!u) return null

  const p = u.profil
  return {
    cjsUid:        u.cjsUid,
    nom:           u.nom,
    prenom:        u.prenom,
    email:         u.email,
    telephone:     u.telephone,
    region:        u.region,
    commune:       u.commune,
    genre:         u.genre,
    dateNaissance: u.dateNaissance?.toISOString().slice(0, 10) ?? null,
    profil: p ? {
      id:                p.id,
      biographie:        p.biographie,
      niveauEtude:       p.niveauEtude,
      situationEmploi:   p.situationEmploi,
      domainesInteret:   (p.domainesInteret as string[] | null) ?? [],
      competences:       (p.competences    as string[] | null) ?? [],
      completionScore:   p.completionScore,
      profileVisibility: p.profileVisibility,
    } : null,
    experiences: (p?.experiences ?? []).map(e => ({
      id:           e.id,
      poste:        e.poste,
      organisation: e.organisation,
      dateDebut:    e.dateDebut.toISOString().slice(0, 10),
      dateFin:      e.dateFin?.toISOString().slice(0, 10) ?? null,
      description:  e.description,
    })),
    certificats: (p?.certificats ?? []).map(c => ({
      id:            c.id,
      formation:     c.formation,
      obtenuLe:      c.obtenuLe.toISOString().slice(0, 10),
      urlCertificat: c.urlCertificat,
    })),
  }
}
