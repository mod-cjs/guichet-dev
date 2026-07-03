import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getConseillerContext, getAgendaDuJour } from '@/lib/loaders/conseiller'
import { AgendaDuJour } from '../agenda-du-jour'
import { Icon } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/** GUIC-497 — Agenda du conseiller (vue jour, dérivée Réservation + Événement). */
const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default async function ConseillerAgendaPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const items = await getAgendaDuJour(ctx.centreId)
  const d = DATE_FMT.format(new Date())

  return (
    <div className="flex flex-col gap-space-4" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Agenda &amp; RDV</h1>
        <p className="inline-flex items-center gap-space-2 text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
          <span>{d.charAt(0).toUpperCase() + d.slice(1)}</span>
          <span className="inline-flex items-center gap-space-1 text-gj-teal-deep font-semibold"><Icon name="pin" size={13} />{ctx.centreNom}</span>
        </p>
      </div>
      <AgendaDuJour items={items} />
    </div>
  )
}
