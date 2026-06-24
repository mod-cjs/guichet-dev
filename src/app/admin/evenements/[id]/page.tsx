import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  AdminEvenementDetail,
  type EvenementDetailData,
  type EvenementInscrit,
} from './AdminEvenementDetail'

export const metadata: Metadata = { title: 'Détail événement — Admin CJS' }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const { id } = await params

  const ev = await prisma.evenement.findUnique({
    where: { id },
    select: {
      id: true,
      titre: true,
      type: true,
      statut: true,
      dateDebut: true,
      lieu: true,
      capaciteMax: true,
      centre: { select: { nom: true } },
      inscriptions: {
        select: {
          id: true,
          statut: true,
          inscritA: true,
          utilisateur: { select: { prenom: true, nom: true } },
        },
        orderBy: { inscritA: 'asc' },
      },
    },
  })

  if (!ev) notFound()

  // Compteurs par statut (calculés sur l'ensemble des inscriptions).
  const by = { inscrit: 0, present: 0, liste_attente: 0, annule: 0 }
  for (const i of ev.inscriptions) by[i.statut] += 1

  const inscritsConfirmes = by.inscrit + by.present
  const tauxRemplissage = ev.capaciteMax && ev.capaciteMax > 0
    ? Math.round((inscritsConfirmes / ev.capaciteMax) * 100)
    : 0
  const tauxPresence = inscritsConfirmes > 0
    ? Math.round((by.present / inscritsConfirmes) * 100)
    : 0

  // Liste affichée : tout sauf les annulés (supervision des présents/attente).
  const inscrits: EvenementInscrit[] = ev.inscriptions
    .filter((i) => i.statut !== 'annule')
    .map((i) => ({
      id: i.id,
      prenom: i.utilisateur.prenom,
      nom: i.utilisateur.nom,
      statut: i.statut,
      inscritA: i.inscritA,
    }))

  const data: EvenementDetailData = {
    id: ev.id,
    titre: ev.titre,
    type: ev.type,
    statut: ev.statut,
    dateDebut: ev.dateDebut,
    lieu: ev.lieu,
    centreNom: ev.centre?.nom ?? null,
    capaciteMax: ev.capaciteMax,
    stats: {
      inscrits: inscritsConfirmes,
      presents: by.present,
      listeAttente: by.liste_attente,
      annules: by.annule,
      tauxRemplissage,
      tauxPresence,
    },
    inscrits,
  }

  return <AdminEvenementDetail data={data} />
}
