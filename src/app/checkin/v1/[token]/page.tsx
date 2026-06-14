/**
 * GUIC-387 — Page scanner staff `/checkin/v1/[token]`.
 *
 * Page publique (pas d'auth SSO jeune). Le staff scanne le QR de la
 * MyCJSCard → atterrit ici → confirme le check-in via formulaire MVP.
 *
 * Server : vérifie JWT (signature + exp), charge utilisateur + réservations
 * du jour, rend `<CheckInClient />`.
 */

import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import {
  CJSCardTokenError,
  verifyCJSCardToken,
} from '@/lib/auth/verifyCJSCardToken'
import { Icon } from '@/components/ui/Icon'
import { CheckInClient, type CheckInJeune, type CheckInReservation, type CheckInCentreOption } from './checkin-client'

export const dynamic = 'force-dynamic'

function ErrorView({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-color-surface-base p-space-5 flex flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-gj-lg bg-white p-space-5 shadow-gj-md text-center">
        <div className="mx-auto mb-space-3 text-gj-red">
          <Icon name="alert" size={40} title="Erreur" />
        </div>
        <h1 className="text-fs-500 font-bold text-color-text-primary mb-space-2">{title}</h1>
        <p className="text-fs-300 text-color-text-secondary">{message}</p>
      </div>
    </main>
  )
}

function maskCjsUid(uid: string): string {
  if (!uid) return ''
  if (uid.length <= 4) return `xxxxx-${uid}`
  return `xxxxx-${uid.slice(-4)}`
}

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  let payload
  try {
    payload = await verifyCJSCardToken(token)
  } catch (err) {
    if (err instanceof CJSCardTokenError && err.reason === 'expired') {
      return (
        <ErrorView
          title="QR expiré"
          message="Ce QR code a expiré. Demandez au jeune de rafraîchir sa carte CJS."
        />
      )
    }
    return (
      <ErrorView
        title="QR invalide"
        message="Ce QR code n'est pas reconnu."
      />
    )
  }

  if (!payload) {
    return (
      <ErrorView
        title="QR invalide"
        message="Ce QR code n'est pas reconnu."
      />
    )
  }

  // Chargement données pour pré-affichage
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setHours(23, 59, 59, 999)

  const [utilisateur, centres, reservations] = await Promise.all([
    prisma.utilisateur.findUnique({
      where:  { cjsUid: payload.sub },
      select: { cjsUid: true, nom: true, prenom: true },
    }),
    prisma.centre.findMany({
      where:   { estActif: true },
      select:  { id: true, nom: true, ville: true },
      orderBy: { nom: 'asc' },
      take:    200,
    }),
    prisma.reservation.findMany({
      where: {
        cjsUid:       payload.sub,
        dateReservee: { gte: startOfDay, lte: endOfDay },
        statut:       { in: ['Acceptee', 'EnAttente'] },
      },
      select: {
        id:           true,
        centreId:     true,
        creneauDebut: true,
        creneauFin:   true,
        statut:       true,
        ressource:    { select: { nom: true, type: true } },
        centre:       { select: { nom: true } },
      },
      orderBy: { creneauDebut: 'asc' },
    }),
  ])

  if (!utilisateur) {
    return (
      <ErrorView
        title="Jeune introuvable"
        message="L'identifiant porté par ce QR n'existe pas dans le système."
      />
    )
  }

  const jeune: CheckInJeune = {
    nom:          utilisateur.nom,
    prenom:       utilisateur.prenom,
    cjsUidMasked: maskCjsUid(utilisateur.cjsUid),
  }

  const reservationsView: CheckInReservation[] = reservations.map((r) => ({
    id:           r.id,
    centreId:     r.centreId,
    centreNom:    r.centre?.nom ?? '',
    creneauDebut: r.creneauDebut,
    creneauFin:   r.creneauFin,
    ressourceNom: r.ressource?.nom ?? '',
    ressourceType: r.ressource?.type ?? '',
  }))

  const centresOptions: CheckInCentreOption[] = centres.map((c) => ({
    id:    c.id,
    label: c.ville ? `${c.nom} — ${c.ville}` : c.nom,
  }))

  return (
    <Suspense>
      <CheckInClient
        token={token}
        jeune={jeune}
        reservations={reservationsView}
        centres={centresOptions}
      />
    </Suspense>
  )
}
