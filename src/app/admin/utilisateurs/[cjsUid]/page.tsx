import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { auditPiiAccess } from '@/lib/audit'
import { AdminUserDetail, type UserDetailData } from './AdminUserDetail'

export const metadata: Metadata = { title: 'Fiche bénéficiaire — Admin CJS' }

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export default async function Page({
  params,
}: {
  params: Promise<{ cjsUid: string }>
}) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const { cjsUid } = await params

  const [u, candidaturesRetenues] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { cjsUid },
      select: {
        cjsUid: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        region: true,
        commune: true,
        statut: true,
        role: true,
        createdAt: true,
        profil: {
          select: {
            completionScore: true,
            niveauEtude: true,
            situationEmploi: true,
            biographie: true,
            photoUrl: true,
            domainesInteret: true,
            centrePrincipal: { select: { nom: true } },
            _count: { select: { diplomes: true, experiences: true, certificats: true } },
          },
        },
        _count: {
          select: {
            candidatures: true,
            inscriptions: true,
            reservations: true,
            checkIns: true,
            ressourcesFavoris: true,
            opportunitesFavorites: true,
            insertions: true,
          },
        },
      },
    }),
    prisma.candidature.count({ where: { cjsUid, statut: 'Retenue' } }),
  ])

  if (!u) notFound()

  // E1 — traçabilité CDP : consultation d'une fiche bénéficiaire (PII) journalisée
  // (stdout haché + trail audit_logs). Après le notFound() pour ne tracer que les
  // accès réels. Fail-soft : n'interrompt jamais le rendu de la page.
  await auditPiiAccess('fiche_beneficiaire.view', session.cjsUid, { targetCjsUid: u.cjsUid })

  const data: UserDetailData = {
    cjsUid: u.cjsUid,
    prenom: u.prenom,
    nom: u.nom,
    email: u.email,
    telephone: u.telephone,
    region: u.region,
    commune: u.commune,
    statut: u.statut,
    role: u.role,
    createdAt: u.createdAt,
    profil: u.profil
      ? {
          completionScore: u.profil.completionScore,
          niveauEtude: u.profil.niveauEtude,
          situationEmploi: u.profil.situationEmploi,
          biographie: u.profil.biographie,
          photoUrl: u.profil.photoUrl,
          centrePrincipalNom: u.profil.centrePrincipal?.nom ?? null,
          domainesInteret: toStringArray(u.profil.domainesInteret),
          diplomesCount: u.profil._count.diplomes,
          experiencesCount: u.profil._count.experiences,
          certificatsCount: u.profil._count.certificats,
        }
      : null,
    activite: {
      candidatures: u._count.candidatures,
      candidaturesRetenues,
      inscriptions: u._count.inscriptions,
      reservations: u._count.reservations,
      checkIns: u._count.checkIns,
      favoris: u._count.ressourcesFavoris + u._count.opportunitesFavorites,
      insertions: u._count.insertions,
    },
  }

  return <AdminUserDetail data={data} />
}
