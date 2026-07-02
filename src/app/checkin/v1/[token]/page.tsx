/**
 * GUIC-387 / GUIC-389 — Page scanner staff `/checkin/v1/[token]`.
 *
 * GUIC-389 :
 *  - Auth staff OBLIGATOIRE (cookie). Redirige `/centre-staff/login?next=...`
 *    si pas de session. Évite la fuite via referer/history du QR scanné.
 *  - On ne charge plus la liste des 200 centres : on restreint au
 *    centre du staff (`staff.centreId`) — réduit l'impression d'avoir
 *    accès au catalogue complet.
 *
 * Server : vérifie JWT (signature + exp), charge utilisateur + réservations
 * du jour, rend `<CheckInClient />`.
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  CJSCardTokenError,
  verifyCJSCardToken,
} from '@/lib/auth/verifyCJSCardToken'
import { getStaffSession } from '@/lib/auth/staff-session'
import { Icon } from '@/components/ui/Icon'
import { CheckInClient, type CheckInJeune, type CheckInReservation, type CheckInCentreOption, type CheckInEvenement } from './checkin-client'

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

  // GUIC-389 : auth staff obligatoire. Le token est dans l'URL, donc même
  // un leak via referer/capture d'écran ne doit pas exposer les données
  // du jeune à un non-staff.
  const staff = await getStaffSession()
  if (!staff) {
    const next = encodeURIComponent(`/checkin/v1/${token}`)
    redirect(`/centre-staff/login?next=${next}`)
  }

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

  // GUIC-389 : on charge UNIQUEMENT le centre du staff (pas les 200).
  const [utilisateur, centre, evenements, reservations] = await Promise.all([
    prisma.utilisateur.findUnique({
      where:  { cjsUid: payload.sub },
      select: { cjsUid: true, nom: true, prenom: true },
    }),
    prisma.centre.findUnique({
      where:  { id: staff.centreId },
      select: { id: true, nom: true, ville: true },
    }),
    // GUIC-474 — cours/sessions EN COURS au centre du staff (présence par badge).
    prisma.evenement.findMany({
      where:  { centreId: staff.centreId, statut: 'en_cours' },
      select: { id: true, titre: true, type: true },
      orderBy: { dateDebut: 'asc' },
      take:   20,
    }),
    prisma.reservation.findMany({
      where: {
        cjsUid:       payload.sub,
        centreId:     staff.centreId,
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

  // GUIC-389 : un seul centre (celui du staff) — restreint la sélection
  // côté UI ; la route API valide aussi côté serveur.
  const centresOptions: CheckInCentreOption[] = centre
    ? [{ id: centre.id, label: centre.ville ? `${centre.nom} — ${centre.ville}` : centre.nom }]
    : []

  const evenementsView: CheckInEvenement[] = evenements.map((e) => ({
    id: e.id,
    titre: e.titre,
    type: String(e.type),
  }))

  return (
    <Suspense>
      <CheckInClient
        token={token}
        jeune={jeune}
        reservations={reservationsView}
        centres={centresOptions}
        evenements={evenementsView}
      />
    </Suspense>
  )
}
