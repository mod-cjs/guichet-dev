import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import {
  getConseillerContext,
  getReservationsCounts,
  getReservationsListe,
  type ReservationTab,
} from '@/lib/loaders/conseiller'
import { ReservationsListe } from './reservations-client'

export const dynamic = 'force-dynamic'

/**
 * GUIC-495 / GUIC-496 — Écran complet Réservations de ressources.
 * Onglets Toutes / À valider / Acceptées / Refusées + lignes détaillées avec
 * validation (accepter avec message, refuser avec motif). Rendu fidèle à
 * `design-guichet-v4/agent-web.jsx` (AgentResa + ResaActionRow).
 */

const TABS: { id: ReservationTab; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'attente', label: 'À valider' },
  { id: 'acceptee', label: 'Acceptées' },
  { id: 'refusee', label: 'Refusées' },
]

function isTab(v: string | undefined): v is ReservationTab {
  return v === 'all' || v === 'attente' || v === 'acceptee' || v === 'refusee'
}

export default async function ConseillerReservationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const sp = (await searchParams) ?? {}
  const tab: ReservationTab = isTab(sp.tab) ? sp.tab : 'attente'

  const [counts, rows] = await Promise.all([
    getReservationsCounts(ctx.centreId),
    getReservationsListe(ctx.centreId, tab),
  ])

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }} className="flex flex-col gap-space-4">
      <div>
        <h1 className="font-black text-color-text-primary m-0" style={{ fontSize: 24 }}>Réservations de ressources</h1>
        <p className="text-color-text-secondary" style={{ fontSize: 13, marginTop: 3 }}>
          Valide les demandes de salle, véhicule et poste informatique — {ctx.centreNom}.
        </p>
      </div>

      {/* Onglets (server-driven via ?tab=) */}
      <div className="flex flex-wrap gap-space-1 bg-white w-fit max-w-full" style={{ border: '1.5px solid var(--gj-line)', borderRadius: 12, padding: 5 }} role="tablist" aria-label="Filtrer les réservations">
        {TABS.map((t) => {
          const on = t.id === tab
          const n = counts[t.id]
          return (
            <Link
              key={t.id}
              href={`/conseiller/reservations?tab=${t.id}`}
              role="tab"
              aria-selected={on}
              className="no-underline inline-flex items-center gap-space-2 font-extrabold"
              style={{
                padding: '9px 16px', borderRadius: 8, fontSize: 13,
                background: on ? 'var(--gj-teal-deep)' : 'transparent',
                color: on ? '#fff' : 'var(--gj-grey)',
              }}
            >
              {t.label}
              <span className="font-extrabold" style={{ fontSize: 11, background: on ? 'rgba(255,255,255,.22)' : 'var(--gj-bg)', color: on ? '#fff' : 'var(--gj-grey)', padding: '1px 7px', borderRadius: 999 }}>{n}</span>
            </Link>
          )
        })}
      </div>

      <ReservationsListe rows={rows} tab={tab} />
    </div>
  )
}
