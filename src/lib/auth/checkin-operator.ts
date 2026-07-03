import { getStaffSession } from '@/lib/auth/staff-session'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'

/**
 * GUIC-498 — Opérateur de check-in unifié : soit un membre du staff centre
 * (cookie `centre_staff_session`, legacy MVP), soit un conseiller SSO rattaché
 * via `AgentCentre`. Permet au conseiller de valider une présence sans le
 * stopgap staff. Conserve toutes les garanties de sécurité (le centre du
 * check-in doit faire partie de `centreIds`).
 */
export interface CheckinOperator {
  kind: 'staff' | 'conseiller'
  /** Centre pré-sélectionné pour l'écran de scan. */
  activeCentreId: string
  /** Centres autorisés pour ce check-in. */
  centreIds: string[]
  /** Identité tracée dans `CheckIn.conseillerEmail`. */
  email: string
  /** Libellé lisible de l'opérateur. */
  label: string
}

export async function getCheckinOperator(): Promise<CheckinOperator | null> {
  const staff = await getStaffSession()
  if (staff) {
    return {
      kind: 'staff',
      activeCentreId: staff.centreId,
      centreIds: [staff.centreId],
      email: staff.email.trim().toLowerCase(),
      label: staff.email,
    }
  }

  const session = await getSession()
  if (session) {
    const ctx = await getConseillerContext(session.cjsUid)
    if (ctx) {
      return {
        kind: 'conseiller',
        activeCentreId: ctx.centreId,
        centreIds: ctx.centres.map((c) => c.id),
        email: (session.email ?? `${session.cjsUid}@conseiller.local`).trim().toLowerCase(),
        label: `${session.prenom} ${session.nom}`.trim(),
      }
    }
  }

  return null
}
