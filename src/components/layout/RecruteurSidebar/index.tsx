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

const STORAGE_KEY = 'gj-recruteur-sidebar-collapsed'

export interface RecruteurSidebarProps {
  /** Nom de l'organisation (carte entreprise). */
  companyName?: string | null
  /** Partenaire vérifié (badge). */
  verified?: boolean
  /** Compteurs de nav (offres, candidatures à examiner). */
  offresCount?: number | null
  candidaturesCount?: number | null
}

/**
 * RecruteurSidebar — chrome de l'Espace Recruteur (design v3 Lot 10).
 * Sidebar BLANCHE, accent BLEU, carte entreprise + carte « Besoin de profils ? ».
 * Calquée sur `design-guichet-v3/recruteur-shell.jsx`. Drawer mobile + collapse desktop.
 */
export function RecruteurSidebar({ companyName, verified, offresCount, candidaturesCount }: RecruteurSidebarProps = {}) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'true') setCollapsed(true)
    } catch { /* noop */ }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try { window.localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* noop */ }
      return next
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const width = collapsed ? 64 : 256

  const SECTIONS: Section[] = [
    { items: [{ id: 'home', href: '/recruteur/tableau-de-bord', icon: 'home', label: 'Tableau de bord' }] },
    {
      title: 'Recrutement',
      items: [
        { id: 'offres', href: '/recruteur/mes-offres', icon: 'employment', label: 'Mes offres', badge: offresCount ?? null },
        { id: 'candidatures', href: '/recruteur/candidatures', icon: 'document', label: 'Candidatures', badge: candidaturesCount ?? null },
        { id: 'entretiens', href: '/recruteur/entretiens', icon: 'calendar', label: 'Entretiens' },
        { id: 'messagerie', href: '/recruteur/messagerie', icon: 'chat', label: 'Messagerie' },
      ],
    },
    {
      title: 'Entreprise',
      items: [
        { id: 'company', href: '/recruteur/profil-entreprise', icon: 'users', label: 'Profil entreprise' },
        { id: 'settings', href: '/recruteur/parametres', icon: 'settings', label: 'Paramètres' },
      ],
    },
  ]

  return (
    <>
      {/* Hamburger mobile — masqué : la navigation mobile passe par RecruteurBottomNav (GUIC-492). */}
      <button
        type="button"
        className="hidden fixed left-space-3 z-[200] flex-col justify-center gap-[4px] w-8 h-8 bg-transparent border-none"
        style={{ top: 'calc(8px + var(--safe-top))' }}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
      >
        <span className="block w-5 h-0.5" style={{ background: 'var(--gj-blue-ink, #1A3FA8)' }} />
        <span className="block w-5 h-0.5" style={{ background: 'var(--gj-blue-ink, #1A3FA8)' }} />
        <span className="block w-5 h-0.5" style={{ background: 'var(--gj-blue-ink, #1A3FA8)' }} />
      </button>

      {open && <div className="md:hidden fixed inset-0 bg-black/40 z-[250]" onClick={close} aria-hidden />}

      <aside
        role="navigation"
        aria-label="Navigation recruteur"
        className={`fixed md:static inset-y-0 left-0 z-[260] md:z-auto min-h-screen flex flex-col transition-all duration-200 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ width, background: '#fff', borderRight: '1px solid var(--gj-line)', padding: '14px 12px', overflowY: 'auto' }}
      >
        {/* Marque */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 6px 13px', borderBottom: '1px solid var(--gj-line)', marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--gj-blue-ink, #1A3FA8)', letterSpacing: '.5px', textTransform: 'uppercase', lineHeight: 1.2 }}>
            {collapsed ? 'ER' : 'Espace recruteur'}
          </span>
        </div>

        {/* Carte entreprise */}
        {!collapsed && companyName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 11, borderRadius: 12, marginBottom: 8, background: 'linear-gradient(135deg, var(--gj-blue-soft, #E8EFFF), #fff)', border: '1.5px solid var(--gj-blue, #1A4ED8)' }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'var(--gj-blue, #1A4ED8)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>{companyName.slice(0, 1).toUpperCase()}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--gj-ink)' }} className="truncate">{companyName}</div>
              {verified && (
                <div style={{ fontSize: 10.5, color: 'var(--gj-blue-ink, #1A3FA8)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="check-circle" size={11} /> Partenaire vérifié
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sections */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map((section, sIdx) => (
            <div key={section.title ?? `s-${sIdx}`}>
              {section.title && !collapsed && (
                <div style={{ fontSize: 9.5, color: 'var(--gj-grey)', fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', padding: '14px 10px 5px' }}>{section.title}</div>
              )}
              {section.items.map((item) => {
                const on = isActive(item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={close}
                    aria-current={on ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className="no-underline"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: 11, padding: '10px', borderRadius: 9, fontSize: 13, minHeight: 40, width: '100%',
                      color: on ? 'var(--gj-blue-ink, #1A3FA8)' : 'var(--gj-grey)',
                      fontWeight: on ? 800 : 600,
                      background: on ? 'var(--gj-blue-soft, #E8EFFF)' : 'transparent',
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                    {!collapsed && item.badge != null && item.badge > 0 && (
                      <span style={{ marginLeft: 'auto', background: 'var(--gj-blue, #1A4ED8)', color: '#fff', fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 10 }}>{item.badge}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Carte « Besoin de profils ? » */}
        {!collapsed && (
          <div style={{ padding: 12, background: 'var(--gj-blue-soft, #E8EFFF)', borderRadius: 12, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gj-blue-ink, #1A3FA8)' }}>Besoin de profils ?</div>
            <div style={{ fontSize: 11, color: 'var(--gj-grey)', marginTop: 3, lineHeight: 1.4 }}>Publie une offre et touche les jeunes du réseau CJS.</div>
            <Link href="/recruteur/mes-offres/nouvelle" className="no-underline" style={{ display: 'block', textAlign: 'center', width: '100%', marginTop: 10, background: 'var(--gj-blue, #1A4ED8)', color: '#fff', minHeight: 40, lineHeight: '40px', borderRadius: 9, fontWeight: 800, fontSize: 12.5 }}>+ Nouvelle offre</Link>
          </div>
        )}

        {/* Footer : collapse + déconnexion */}
        <div style={{ paddingTop: 12, marginTop: 8, borderTop: '1px solid var(--gj-line)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Étendre la barre latérale' : 'Réduire la barre latérale'}
            className="hidden md:flex"
            style={{ alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 12.5, color: 'var(--gj-grey)', fontWeight: 600, minHeight: 44, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
            {!collapsed && <span>Réduire</span>}
          </button>
          <Link href="/api/auth/logout" className="no-underline" title={collapsed ? 'Se déconnecter' : undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 12.5, color: 'var(--gj-grey)', fontWeight: 600, minHeight: 44 }}>
            <Icon name="external" size={16} />
            {!collapsed && <span>Se déconnecter</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
