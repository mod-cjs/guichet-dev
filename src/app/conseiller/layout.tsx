import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getSession } from '@/lib/auth'
import { getConseillerContext, countReservationsAValider } from '@/lib/loaders/conseiller'
import { countUnreadMessages } from '@/lib/loaders/messagerie'
import { countUnreadNotifications } from '@/lib/loaders/notifications'
import { ConseillerSidebar } from '@/components/layout/ConseillerSidebar'
import { SkipLink } from '@/components/ui/SkipLink'
import { Icon } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * GUIC-493 / GUIC-501 — Layout de l'Espace conseiller (Lot 8).
 *
 * Guard : SSO obligatoire (`getSession`) + rattachement `AgentCentre`
 * (`getConseillerContext`). Aucun login local. Un utilisateur authentifié mais
 * sans rattachement centre est renvoyé à l'accueil. Voir
 * `.agent_context/specs/M8-espace-conseiller.md`.
 */
export default async function ConseillerLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const [reservationsBadge, messagesBadge, notifsBadge] = await Promise.all([
    countReservationsAValider(ctx.centreId),
    countUnreadMessages(ctx.cjsUid),
    countUnreadNotifications(ctx.cjsUid),
  ])

  const fullName = `${ctx.prenom} ${ctx.nom}`.trim() || 'Conseiller'
  const roleLabel = ctx.role === 'conseiller' ? 'Conseiller' : ctx.role

  return (
    <>
      <SkipLink />

      {/* Barre mobile — logo décalé du hamburger + cloche */}
      <div
        className="md:hidden sticky top-0 flex items-center gap-2 pl-[52px] pr-space-3"
        style={{ zIndex: 199, paddingTop: 'var(--safe-top, 0px)', minHeight: 'var(--gj-topbar-h, 56px)', background: 'var(--gj-ink-teal)', color: '#fff' }}
      >
        <span className="font-bold text-fs-300 flex-1 truncate">Espace conseiller</span>
        <Link href="/conseiller/notifications" aria-label={`Notifications${notifsBadge > 0 ? ` (${notifsBadge} non lues)` : ''}`} className="relative inline-flex items-center justify-center no-underline text-white" style={{ width: 40, height: 40 }}>
          <Icon name="bell" size={20} />
          {notifsBadge > 0 && (
            <span aria-hidden style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--gj-red)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {notifsBadge > 9 ? '9+' : notifsBadge}
            </span>
          )}
        </Link>
      </div>

      <div className="flex min-h-screen" style={{ background: 'var(--gj-bg)' }}>
        <ConseillerSidebar
          name={fullName}
          role={roleLabel}
          centreNom={ctx.centreNom}
          initials={ctx.initials}
          reservationsBadge={reservationsBadge}
          messagesBadge={messagesBadge}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* TopBar desktop (design v4 `agent-shell.jsx`) : recherche + notifications + Publier */}
          <div
            className="hidden md:flex items-center gap-[14px]"
            style={{ background: '#fff', borderBottom: '1px solid var(--gj-line)', padding: '0 24px', minHeight: 64 }}
          >
            <div className="flex-1" />
            <form action="/conseiller/beneficiaires" method="get" role="search" className="flex items-center gap-2" style={{ background: 'var(--gj-bg)', border: '1.5px solid var(--gj-line)', borderRadius: 10, padding: '0 14px', minHeight: 42, width: 280 }}>
              <Icon name="search" size={16} style={{ color: 'var(--gj-grey)' }} />
              <input
                name="q"
                placeholder="Rechercher un bénéficiaire…"
                aria-label="Rechercher un bénéficiaire"
                className="flex-1 bg-transparent outline-none text-fs-300"
                style={{ border: 0, color: 'var(--gj-ink)' }}
              />
            </form>
            <Link href="/conseiller/notifications" aria-label={`Notifications${notifsBadge > 0 ? ` (${notifsBadge} non lues)` : ''}`} className="relative inline-flex items-center justify-center no-underline" style={{ width: 42, height: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
              <Icon name="bell" size={18} />
              {notifsBadge > 0 && (
                <span aria-hidden style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--gj-red)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifsBadge > 9 ? '9+' : notifsBadge}
                </span>
              )}
            </Link>
            <Link href="/conseiller/publications" className="inline-flex items-center gap-2 no-underline" style={{ background: 'var(--gj-teal-deep)', color: '#fff', padding: '0 16px', minHeight: 42, borderRadius: 10, fontWeight: 800, fontSize: 13 }}>
              <Icon name="plus" size={15} /> Publier
            </Link>
          </div>

          <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0">{children}</main>
        </div>
      </div>
    </>
  )
}
