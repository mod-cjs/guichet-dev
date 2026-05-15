import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfilClient } from '@/components/profil'
import type { ProfilComplet } from '@/types/profil'

export default async function MonProfilPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

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

  if (!utilisateur) redirect('/auth/connexion')

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

  return <ProfilClient initial={data} />
}
