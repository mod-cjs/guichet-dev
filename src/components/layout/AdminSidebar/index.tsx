'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

/* ── Types ──────────────────────────────────────────────────────────────── */

interface NavItem {
  id: string
  href: string
  icon: IconName
  label: string
  /** Compteur optionnel — null = absent */
  count?: number | null
  /** Affiche le badge en rouge (urgence) plutôt que muted */
  urgent?: boolean
}

interface NavSection {
  title?: string
  items: NavItem[]
}

export interface AdminSidebarProps {
  /** Nom affiché dans la carte utilisateur. Défaut : "Admin national" */
  userName?: string
  /** Rôle affiché sous le nom. Défaut : "Administrateur national" */
  userRole?: string
  /** Initiales pour l'avatar doré. Défaut : "AN" */
  userInitials?: string
  /** Compteur de modération (badge rouge sur l'item Modération). Null = absent. */
  moderationCount?: number | null
  /** Compteur d'escalades Yaye en attente (badge doré sur l'item Escalades). Null = absent. */
  escaladeCount?: number | null
}

/* ── Données de navigation (4 sections Lot 11) ──────────────────────────── */

const SECTIONS: NavSection[] = [
  {
    items: [
      { id: 'home', href: '/admin/tableau-de-bord', icon: 'home', label: 'Tableau de bord' },
    ],
  },
  {
    title: 'Pilotage',
    items: [
      { id: 'centres', href: '/admin/centres', icon: 'pin', label: 'Centres CJS' },
      { id: 'bibliotheque', href: '/admin/bibliotheque', icon: 'resources', label: 'Bibliothèque' },
      { id: 'analytics-centres', href: '/admin/analytics/centres', icon: 'chart', label: 'Fréquentation centres' },
      { id: 'analytics-evenements', href: '/admin/analytics/evenements', icon: 'calendar', label: 'Analytics événements' },
      { id: 'utilisateurs', href: '/admin/utilisateurs', icon: 'users', label: 'Utilisateurs' },
      { id: 'partenaires', href: '/admin/partenaires', icon: 'engagement', label: 'Partenaires' },
      { id: 'candidatures', href: '/admin/candidatures', icon: 'employment', label: 'Candidatures' },
      { id: 'onboarding', href: '/admin/onboarding', icon: 'target', label: 'Onboarding' },
      { id: 'stats', href: '/admin/data-hub', icon: 'trending', label: 'Statistiques' },
    ],
  },
  {
    title: 'Gouvernance',
    items: [
      { id: 'moderation', href: '/admin/opportunites', icon: 'shield', label: 'Modération', urgent: true },
      { id: 'opportunites-gestion', href: '/admin/opportunites/gestion', icon: 'employment', label: 'Opportunités' },
      { id: 'types', href: '/admin/types-opportunite', icon: 'target', label: 'Types d’opportunité' },
      { id: 'sources-veille', href: '/admin/sources-veille', icon: 'trending', label: 'Sources de veille' },
      { id: 'curation', href: '/admin/curation', icon: 'check-circle', label: 'File de curation' },
      { id: 'curation-monitoring', href: '/admin/curation/monitoring', icon: 'chart', label: 'Monitoring veille' },
      { id: 'evenements', href: '/admin/evenements', icon: 'calendar', label: 'Événements' },
      { id: 'contenu', href: '/admin/ressources', icon: 'resources', label: 'Contenu' },
      { id: 'audit', href: '/admin/journal-audit', icon: 'document', label: 'Journal d’audit' },
    ],
  },
  {
    title: 'Assistant IA',
    items: [
      { id: 'yaye-metriques', href: '/admin/analytics/yaye', icon: 'chart', label: 'Métriques Yaye' },
      { id: 'yaye-sessions', href: '/admin/yaye/sessions', icon: 'chat', label: 'Sessions Yaye' },
      { id: 'yaye-escalades', href: '/admin/yaye/escalades', icon: 'bell', label: 'Escalades' },
      { id: 'yaye-modele', href: '/admin/yaye/modele', icon: 'settings', label: 'Modèle IA' },
    ],
  },
]

/** Tous les hrefs de nav — sert à ne garder actif que l'entrée la plus spécifique. */
const ALL_HREFS = SECTIONS.flatMap((s) => s.items.map((i) => i.href))

const STORAGE_KEY = 'gj-admin-sidebar-collapsed'

/* ── Styles partagés (inline — référencent uniquement les CSS vars admin) ─ */

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 9.5,
  color: 'var(--gj-admin-fg-40)',
  fontWeight: 800,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  padding: '14px 10px 5px',
}

const linkBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  padding: '10px',
  borderRadius: 9,
  fontSize: 13,
  color: 'var(--gj-admin-fg-72)',
  fontWeight: 600,
  minHeight: 40,
  background: 'transparent',
  width: '100%',
  textDecoration: 'none',
}

const linkActiveStyle: React.CSSProperties = {
  background: 'var(--gj-admin-gold)',
  color: 'var(--gj-admin-on-gold)',
  fontWeight: 800,
}

/* ── Composant ──────────────────────────────────────────────────────────── */

/**
 * AdminSidebar — chrome administration Lot 11 (sombre + doré, design v3).
 *
 * - Largeur 256px desktop, fond `--gj-admin-bg`, bordure-droite `--gj-admin-border-soft`
 * - 4 sections : Tableau de bord / Pilotage (3) / Gouvernance (3) / footer
 * - Item actif : gradient doré `--gj-admin-gold`, texte `--gj-admin-on-gold`
 * - Mobile : drawer hamburger (pas de bottom-nav — règle absolue GUIC)
 * - GUIC-402 : collapse desktop persisté dans localStorage
 */
export function AdminSidebar({
  userName = 'Admin national',
  userRole = 'Administrateur national',
  userInitials = 'AN',
  moderationCount = null,
  escaladeCount = null,
}: AdminSidebarProps) {
  const pathname = usePathname() ?? ''
  // Compteurs dynamiques par item (badge). Rouge pour les items urgents (modération),
  // doré pour les autres (escalades Yaye en attente).
  const itemCounts: Record<string, number | null> = {
    moderation: moderationCount,
    'yaye-escalades': escaladeCount,
  }
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  // Restauration de l'état collapsed depuis localStorage au mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setCollapsed(true)
    } catch {
      /* localStorage indisponible — état défaut */
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        /* noop */
      }
      return next
    })
  }, [])

  // ESC ferme le drawer.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Un href matche la route s'il en est un préfixe. Mais quand deux entrées se
  // chevauchent (ex. « Modération » /admin/opportunites et « Opportunités »
  // /admin/opportunites/gestion), seule la PLUS SPÉCIFIQUE doit s'allumer.
  const matches = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const isActive = (href: string) => {
    if (!matches(href)) return false
    return !ALL_HREFS.some((other) => other !== href && other.startsWith(href + '/') && matches(other))
  }

  const width = collapsed ? 64 : 256

  return (
    <>
      {/* ── Hamburger mobile ──────────────────────────────────────────── */}
      <button
        type="button"
        className="md:hidden fixed left-space-3 z-[200] flex flex-col justify-center
          gap-[4px] w-8 h-8 bg-transparent border-none"
        style={{ top: 'calc(8px + var(--safe-top))' }}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
      >
        <span className="block w-5 h-0.5 bg-white" />
        <span className="block w-5 h-0.5 bg-white" />
        <span className="block w-5 h-0.5 bg-white" />
      </button>

      {/* ── Overlay mobile ────────────────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[250]"
          onClick={close}
          aria-hidden
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        aria-label="Administration"
        className={`fixed md:static inset-y-0 left-0 z-[260] md:z-auto
          min-h-screen flex flex-col transition-all duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          width,
          background: 'var(--gj-admin-bg)',
          color: 'var(--gj-admin-fg)',
          borderRight: '1px solid var(--gj-admin-border-soft)',
          padding: 14,
          gap: 2,
          flexShrink: 0,
          overflowY: 'auto',
          transitionProperty: 'width, transform',
        }}
      >
        {/* ── Logo + label "Admin national" ───────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '4px 6px 13px',
            borderBottom: '1px solid var(--gj-admin-border)',
            marginBottom: 10,
          }}
        >
          {/* Logo rendu blanc via filter */}
          <img
            src="/logo-guichet.png"
            alt="Guichet Jeunesse.sn"
            style={{ height: 27, width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          {!collapsed && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: 'var(--gj-yellow)',
                letterSpacing: '.5px',
                textTransform: 'uppercase',
                lineHeight: 1.2,
                borderLeft: '1px solid var(--gj-admin-border)',
                paddingLeft: 9,
              }}
            >
              Admin
              <br />
              national
            </span>
          )}
        </div>

        {/* ── Carte utilisateur ───────────────────────────────────────── */}
        {!collapsed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: 11,
              background: 'var(--gj-admin-surface)',
              border: '1px solid var(--gj-admin-border)',
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'var(--gj-admin-gold)',
                color: 'var(--gj-admin-on-gold)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13,
              }}
              aria-hidden
            >
              {userInitials}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  color: 'var(--gj-admin-fg)',
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: 'var(--gj-admin-fg-60)',
                  marginTop: 2,
                }}
              >
                {userRole}
              </div>
            </div>
          </div>
        )}

        {/* ── Sections de navigation ──────────────────────────────────── */}
        <nav
          aria-label="Navigation administration"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {SECTIONS.map((section, sIdx) => (
            <div key={section.title ?? `section-${sIdx}`}>
              {section.title && !collapsed && (
                <div style={sectionHeaderStyle}>{section.title}</div>
              )}
              {section.items.map(item => {
                const on = isActive(item.href)
                const badgeCount = itemCounts[item.id]
                const showBadge = badgeCount != null && badgeCount > 0

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={close}
                    aria-current={on ? 'page' : undefined}
                    data-active={on ? 'true' : undefined}
                    title={collapsed ? item.label : undefined}
                    style={{
                      ...linkBaseStyle,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '10px 0' : '10px',
                      // Item actif : gradient doré --gj-admin-gold (rendu navigateur ;
                      // jsdom n'évalue pas var() sur le shorthand background).
                      ...(on ? linkActiveStyle : {}),
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {showBadge && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              background: item.urgent ? 'var(--gj-red)' : 'var(--gj-admin-gold)',
                              color: item.urgent ? 'var(--gj-surface)' : 'var(--gj-admin-on-gold)',
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 10,
                            }}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid var(--gj-admin-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* Statut systèmes — masqué en mode collapsed */}
          {!collapsed && (
            <div
              style={{
                padding: 11,
                background: 'var(--gj-admin-surface)',
                border: '1px solid var(--gj-admin-border)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--gj-green)',
                  flexShrink: 0,
                }}
                aria-hidden
              />
              <div
                style={{
                  fontSize: 10.5,
                  color: 'var(--gj-admin-fg)',
                  lineHeight: 1.4,
                }}
              >
                Tous les systèmes opérationnels
              </div>
            </div>
          )}

          {/* Toggle collapse — desktop uniquement */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Étendre la barre latérale' : 'Réduire la barre latérale'}
            title={collapsed ? 'Étendre' : 'Réduire'}
            className="hidden md:flex"
            style={{
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10,
              padding: collapsed ? '9px 0' : '9px 10px',
              borderRadius: 8,
              fontSize: 12.5,
              color: 'var(--gj-admin-fg-72)',
              fontWeight: 600,
              minHeight: 44,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'inherit',
            }}
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
            {!collapsed && <span>Réduire</span>}
          </button>

          {/* Déconnexion */}
          <Link
            href="/api/auth/logout"
            title={collapsed ? 'Se déconnecter' : undefined}
            style={{
              ...linkBaseStyle,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '9px 0' : '9px 10px',
              fontSize: 12.5,
              color: 'var(--gj-admin-fg-72)',
            }}
          >
            <Icon name="logout" size={16} />
            {!collapsed && <span>Se déconnecter</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
