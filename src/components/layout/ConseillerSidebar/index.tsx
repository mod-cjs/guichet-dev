'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

interface Item {
  id: string
  href: string
  icon: IconName
  label: string
  badge?: number | null
}

interface Section {
  title?: string
  items: Item[]
}

export interface ConseillerSidebarProps {
  /** Nom complet du conseiller (carte utilisateur). */
  name: string
  /** Rôle affiché (ex. « Conseiller »). */
  role: string
  /** Centre de rattachement actif. */
  centreNom: string
  /** Initiales pour l'avatar. */
  initials: string
  /** Réservations à valider (badge doré). */
  reservationsBadge?: number | null
  /** Messages non lus (badge doré). */
  messagesBadge?: number | null
}

/**
 * ConseillerSidebar — chrome de l'Espace conseiller (Lot 8, design v4 `agent-shell.jsx`).
 * Sidebar FONCÉE `--gj-ink-teal`, accent doré, actif `--gj-teal`. Desktop fixe +
 * drawer hamburger mobile (pas de bottom-nav en Phase 1). GUIC-501.
 */
export function ConseillerSidebar({
  name,
  role,
  centreNom,
  initials,
  reservationsBadge,
  messagesBadge,
}: ConseillerSidebarProps) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Ferme le drawer à chaque changement de route.
  useEffect(() => { setOpen(false) }, [pathname])

  const isActive = (href: string) =>
    href === '/conseiller' ? pathname === '/conseiller' : pathname === href || pathname.startsWith(href + '/')

  const SECTIONS: Section[] = [
    { items: [{ id: 'home', href: '/conseiller', icon: 'home', label: 'Tableau de bord' }] },
    {
      title: 'Activité du centre',
      items: [
        { id: 'resa', href: '/conseiller/reservations', icon: 'calendar', label: 'Réservations', badge: reservationsBadge ?? null },
        { id: 'agenda', href: '/conseiller/agenda', icon: 'clock', label: 'Agenda & RDV' },
        { id: 'checkin', href: '/conseiller/checkin', icon: 'target', label: 'Check-in présence' },
        { id: 'messagerie', href: '/conseiller/messagerie', icon: 'chat', label: 'Messagerie', badge: messagesBadge ?? null },
      ],
    },
    {
      title: 'Gestion',
      items: [
        { id: 'benef', href: '/conseiller/beneficiaires', icon: 'users', label: 'Bénéficiaires' },
        { id: 'publications', href: '/conseiller/publications', icon: 'employment', label: 'Publications' },
      ],
    },
    {
      title: 'Compte',
      items: [{ id: 'settings', href: '/conseiller/parametres', icon: 'settings', label: 'Paramètres' }],
    },
  ]

  return (
    <>
      {/* Hamburger mobile */}
      <button
        type="button"
        className="md:hidden fixed left-space-3 z-[200] flex flex-col justify-center gap-[4px] w-9 h-9 rounded-md"
        style={{ top: 'calc(8px + var(--safe-top, 0px))', background: 'var(--gj-ink-teal)' }}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu conseiller'}
        aria-expanded={open}
      >
        <span className="block w-5 h-0.5 mx-auto bg-white" />
        <span className="block w-5 h-0.5 mx-auto bg-white" />
        <span className="block w-5 h-0.5 mx-auto bg-white" />
      </button>

      {open && <div className="md:hidden fixed inset-0 bg-black/50 z-[250]" onClick={close} aria-hidden />}

      <aside
        role="navigation"
        aria-label="Navigation conseiller"
        className={`fixed md:static inset-y-0 left-0 z-[260] md:z-auto min-h-screen flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ width: 260, flexShrink: 0, background: 'var(--gj-ink-teal)', color: '#fff', borderRight: '1px solid rgba(255,255,255,.08)', padding: 14, overflowY: 'auto' }}
      >
        {/* Marque */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 14px', borderBottom: '1px solid rgba(255,255,255,.1)', marginBottom: 10 }}>
          <Link href="/conseiller" className="no-underline inline-flex" aria-label="Guichet Jeunesse — accueil conseiller">
            <img src="/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 28, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          </Link>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--gj-yellow)', letterSpacing: '.5px', textTransform: 'uppercase', lineHeight: 1.2, borderLeft: '1px solid rgba(255,255,255,.2)', paddingLeft: 9 }}>
            Espace<br />conseiller
          </span>
        </div>

        {/* Carte utilisateur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, marginBottom: 8 }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--gj-yellow), #E0A93B)', color: 'var(--gj-ink-teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>
            {initials}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.2 }} className="truncate">{name}</div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.6)', marginTop: 2 }} className="truncate">{role}</div>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.8)', background: 'rgba(255,255,255,.06)', padding: '7px 10px', borderRadius: 8, marginBottom: 4, maxWidth: '100%' }}>
          <Icon name="pin" size={13} className="shrink-0" style={{ color: 'var(--gj-yellow)' }} />
          <span className="truncate">{centreNom}</span>
        </div>

        {/* Sections */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map((section, sIdx) => (
            <div key={section.title ?? `s-${sIdx}`}>
              {section.title && (
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.45)', fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', padding: '14px 10px 5px' }}>{section.title}</div>
              )}
              {section.items.map((item) => {
                const on = isActive(item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={on ? 'page' : undefined}
                    className="no-underline"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11, padding: '10px', borderRadius: 9,
                      fontSize: 13, minHeight: 40, width: '100%',
                      color: on ? '#fff' : 'rgba(255,255,255,.72)',
                      fontWeight: on ? 800 : 600,
                      background: on ? 'var(--gj-teal)' : 'transparent',
                      boxShadow: on ? '0 4px 14px rgba(0,178,135,.35)' : undefined,
                    }}
                  >
                    <Icon name={item.icon} size={18} className="shrink-0" />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span style={{ marginLeft: 'auto', background: 'var(--gj-yellow)', color: 'var(--gj-ink-teal)', fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 10 }}>{item.badge}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer : aide + déconnexion */}
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ padding: 11, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name="info" size={17} className="shrink-0" style={{ color: 'var(--gj-yellow)' }} />
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.7)', lineHeight: 1.4 }}>Centre d'aide &amp; guide conseiller</div>
          </div>
          <Link href="/api/auth/logout" className="no-underline" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 12.5, color: 'rgba(255,255,255,.72)', fontWeight: 600, minHeight: 44 }}>
            <Icon name="logout" size={16} className="shrink-0" />
            <span>Se déconnecter</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
