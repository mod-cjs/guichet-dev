import { prisma } from '@/lib/prisma'
import { calculerScore } from '@/lib/profil-score'
import type { ProfilComplet } from '@/types/profil'

export async function recalculerEtPersisterScore(cjsUid: string): Promise<number> {
  const [utilisateur, expCount, diplomeCount] = await Promise.all([
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
    prisma.diplome.count({ where: { profil: { cjsUid } } }),
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
    diplomeCount,
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
          id: true, photoUrl: true, cvUrl: true, cvUploadedAt: true, biographie: true, niveauEtude: true, situationEmploi: true,
          situationHandicap: true, zoneHabitation: true,
          domainesInteret: true, competences: true, completionScore: true, profileVisibility: true,
          // GUIC-689 — « Objectif & secteurs visés » + langues + engagements.
          objectif: true, typesRecherches: true, regionsMobilite: true,
          langues: {
            select: { id: true, langue: true, niveau: true },
            orderBy: { langue: 'asc' },
          },
          engagements: {
            select: { id: true, role: true, organisation: true, dateDebut: true, dateFin: true, description: true },
            orderBy: { dateDebut: 'desc' },
          },
          experiences: {
            select: { id: true, poste: true, organisation: true, dateDebut: true, dateFin: true, description: true },
            orderBy: { dateDebut: 'desc' },
          },
          diplomes: {
            select: { id: true, intitule: true, etablissement: true, anneeObtention: true, niveau: true, mention: true, fichierUrl: true },
            orderBy: { anneeObtention: 'desc' },
          },
          certificats: {
            select: { id: true, formation: true, obtenuLe: true, urlCertificat: true, fichierUrl: true },
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
      photoUrl:          p.photoUrl,
      cvUrl:             p.cvUrl ?? null,
      cvUploadedAt:      p.cvUploadedAt ?? null,
      biographie:        p.biographie,
      niveauEtude:       p.niveauEtude,
      situationEmploi:   p.situationEmploi,
      situationHandicap: p.situationHandicap,
      zoneHabitation:    p.zoneHabitation,
      domainesInteret:   (p.domainesInteret as string[] | null) ?? [],
      competences:       (p.competences    as string[] | null) ?? [],
      objectif:          p.objectif,
      typesRecherches:   (p.typesRecherches as string[] | null) ?? [],
      regionsMobilite:   (p.regionsMobilite as string[] | null) ?? [],
      completionScore:   p.completionScore,
      profileVisibility: p.profileVisibility,
    } : null,
    langues: (p?.langues ?? []).map(l => ({
      id:     l.id,
      langue: l.langue,
      niveau: l.niveau,
    })),
    engagements: (p?.engagements ?? []).map(e => ({
      id:           e.id,
      role:         e.role,
      organisation: e.organisation,
      dateDebut:    e.dateDebut.toISOString().slice(0, 10),
      dateFin:      e.dateFin?.toISOString().slice(0, 10) ?? null,
      description:  e.description,
    })),
    experiences: (p?.experiences ?? []).map(e => ({
      id:           e.id,
      poste:        e.poste,
      organisation: e.organisation,
      dateDebut:    e.dateDebut.toISOString().slice(0, 10),
      dateFin:      e.dateFin?.toISOString().slice(0, 10) ?? null,
      description:  e.description,
    })),
    diplomes: (p?.diplomes ?? []).map(d => ({
      id:             d.id,
      intitule:       d.intitule,
      etablissement:  d.etablissement,
      anneeObtention: d.anneeObtention,
      niveau:         d.niveau,
      mention:        d.mention,
      fichierUrl:     d.fichierUrl,
    })),
    certificats: (p?.certificats ?? []).map(c => ({
      id:            c.id,
      formation:     c.formation,
      obtenuLe:      c.obtenuLe.toISOString().slice(0, 10),
      urlCertificat: c.urlCertificat,
      fichierUrl:    c.fichierUrl,
    })),
  }
}
