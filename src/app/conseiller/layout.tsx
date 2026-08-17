import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getSession } from '@/lib/auth'
import { masquesUtilisateur } from '@/lib/flags/ui-server'
import { filtrerSections, lienMasque } from '@/lib/flags/ui'
import { sectionsConseiller } from '@/components/layout/ConseillerSidebar/nav'
import { CONSEILLER_PRIMAIRES, CONSEILLER_SECONDAIRES } from '@/components/layout/bottom-nav-pro.nav'
import { getConseillerContext, countReservationsAValider } from '@/lib/loaders/conseiller'
import { countUnreadMessages } from '@/lib/loaders/messagerie'
import { countUnreadNotifications } from '@/lib/loaders/notifications'
import { ConseillerSidebar } from '@/components/layout/ConseillerSidebar'
import { ConseillerBottomNav } from '@/components/layout/ConseillerBottomNav'
import { ConseillerSearch } from '@/components/layout/ConseillerSearch'
import { SkipLink } from '@/components/ui/SkipLink'
import { Icon } from '@/components/ui/Icon'
import { resolveConseillerAccess } from '@/lib/auth/espace-roles'
import { EspaceEnAttente } from '@/components/layout/EspaceEnAttente'

export const dynamic = 'force-dynamic'

/**
 * GUIC-493 / GUIC-501 — Layout de l'Espace conseiller (Lot 8).
 *
 * Guard GUIC-526 (spec M8-roles-sso-conseiller-recruteur, décisions D1/D2) :
 * SSO obligatoire (`getSession`), puis accès si rattachement `AgentCentre`
 * (rétrocompat D2) OU rôle SSO `conseiller` — dans ce dernier cas sans
 * rattachement, écran d'attente (D1) au lieu d'un redirect silencieux.
 * Aucun login local. Voir `.agent_context/specs/M8-espace-conseiller.md`.
 */
export default async function ConseillerLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  // GUIC-706 — calcul côté serveur : filtrer côté client afficherait la navigation
  // complète le temps du premier rendu, soit la trace même qu'on retire.
  const masques = await masquesUtilisateur(session?.roles)
  if (!session) redirect('/auth/connexion')

  const ctx = await getConseillerContext(session.cjsUid)
  const access = resolveConseillerAccess({
    hasSession: true,
    roles: session.roles,
    hasRattachement: !!ctx,
  })
  if (access === 'accueil') redirect('/')
  if (access === 'attente' || !ctx) return <EspaceEnAttente espace="conseiller" />

  const [reservationsBadge, messagesBadge, notifsBadge] = await Promise.all([
    countReservationsAValider(ctx.centreId),
    countUnreadMessages(ctx.cjsUid),
    countUnreadNotifications(ctx.cjsUid),
  ])

  const fullName = `${ctx.prenom} ${ctx.nom}`.trim() || 'Conseiller'
  const roleLabel = ctx.role === 'conseiller' ? 'Conseiller' : ctx.role

  // GUIC-706 — le filtrage est un calcul de SERVEUR. La sidebar reçoit les sections à
  // afficher, jamais les clés masquées : les props d'un composant client sont sérialisées
  // dans le HTML, et une liste de clés y annoncerait les fonctionnalités cachées.
  const sectionsVisibles = filtrerSections(
    sectionsConseiller({ reservations: reservationsBadge, messages: messagesBadge }),
    masques,
  )

  return (
    <>
      <SkipLink />

      {/* Barre mobile — marque + cloche (navigation via bottom-nav) */}
      <div
        className="md:hidden sticky top-0 flex items-center gap-2 px-space-4"
        style={{ zIndex: 199, paddingTop: 'var(--safe-top, 0px)', minHeight: 'var(--gj-topbar-h, 56px)', background: 'var(--gj-ink-teal)', color: '#fff' }}
      >
        <span aria-hidden className="inline-flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gj-yellow), #E0A93B)', color: 'var(--gj-ink-teal)', fontWeight: 900, fontSize: 11 }}>
          {ctx.initials}
        </span>
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

      <div className="flex min-h-screen md:h-screen md:overflow-hidden" style={{ background: 'var(--gj-bg)' }}>
        <ConseillerSidebar
          sections={sectionsVisibles}
          name={fullName}
          role={roleLabel}
          initials={ctx.initials}
          centres={ctx.centres}
          activeCentreId={ctx.centreId}
        />

        <div className="flex-1 flex flex-col min-w-0 md:min-h-0">
          {/* TopBar desktop (design v4 `agent-shell.jsx`) : recherche + notifications + Publier */}
          <div
            className="hidden md:flex items-center gap-[14px]"
            style={{ background: '#fff', borderBottom: '1px solid var(--gj-line)', padding: '0 24px', minHeight: 64 }}
          >
            <div className="flex-1" />
            <ConseillerSearch />
            <Link href="/conseiller/notifications" aria-label={`Notifications${notifsBadge > 0 ? ` (${notifsBadge} non lues)` : ''}`} className="relative inline-flex items-center justify-center no-underline" style={{ width: 42, height: 42, borderRadius: 10, border: '1.5px solid var(--gj-line)', color: 'var(--gj-grey)' }}>
              <Icon name="bell" size={18} />
              {notifsBadge > 0 && (
                <span aria-hidden style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--gj-red)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifsBadge > 9 ? '9+' : notifsBadge}
                </span>
              )}
            </Link>
            <Link href="/conseiller/publications/nouvelle" className="inline-flex items-center gap-2 no-underline" style={{ background: 'var(--gj-teal-deep)', color: '#fff', padding: '0 16px', minHeight: 42, borderRadius: 10, fontWeight: 800, fontSize: 13 }}>
              <Icon name="plus" size={15} /> Publier
            </Link>
          </div>

          <main id="main" className="flex-1 p-space-5 md:p-space-6 min-w-0 md:min-h-0 md:overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-space-6">{children}</main>
        </div>
      </div>

      <ConseillerBottomNav
        primaires={CONSEILLER_PRIMAIRES.filter((i) => !lienMasque(i.href, masques))}
        secondaires={CONSEILLER_SECONDAIRES.filter((i) => !lienMasque(i.href, masques))}
        reservationsBadge={reservationsBadge}
        messagesBadge={messagesBadge}
      />
    </>
  )
}
