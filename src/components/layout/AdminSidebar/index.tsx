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
  /** Ton du badge informatif (compteur non urgent) : muted (défaut) ou doré. */
  tone?: 'muted' | 'gold'
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
  /** Compteur de centres (badge muted). */
  centresCount?: number | null
  /** Compteur d'utilisateurs (badge muted, abrégé k). */
  usersCount?: number | null
  /** Compteur d'items de curation à valider (badge muted). */
  curationCount?: number | null
}

/* ── Navigation curée (fidèle maquette) — GUIC-679 ────────────────────────
   Les écrans secondaires (Fréquentation, Analytics, Types, Sources, Monitoring,
   Sessions/Modèle Yaye, Onboarding) sont RE-LOGÉS comme onglets dans leur
   page-hub (Centre, Événements, Opportunités, Curation, Yaye) au fil des écrans ;
   Notifications/Statistiques/Onboarding rejoignent « Système & Exploitation ». */

const SECTIONS: NavSection[] = [
  {
    items: [
      { id: 'home', href: '/admin/tableau-de-bord', icon: 'home', label: 'Tableau de bord' },
    ],
  },
  {
    title: 'Pilotage',
    items: [
      { id: 'centres', href: '/admin/centres', icon: 'pin', label: 'Centres CJS', tone: 'muted' },
      { id: 'utilisateurs', href: '/admin/utilisateurs', icon: 'users', label: 'Utilisateurs', tone: 'muted' },
      { id: 'candidatures', href: '/admin/candidatures', icon: 'employment', label: 'Candidatures' },
      { id: 'partenaires', href: '/admin/partenaires', icon: 'engagement', label: 'Partenaires' },
    ],
  },
  {
    title: 'Gouvernance',
    items: [
      { id: 'moderation', href: '/admin/opportunites', icon: 'shield', label: 'Modération', urgent: true },
      { id: 'curation', href: '/admin/curation', icon: 'check-circle', label: 'Curation' },
      { id: 'opportunites-gestion', href: '/admin/opportunites/gestion', icon: 'employment', label: 'Opportunités' },
      { id: 'audit', href: '/admin/journal-audit', icon: 'document', label: 'Journal d’audit' },
    ],
  },
  {
    title: 'Contenu',
    items: [
      { id: 'bibliotheque', href: '/admin/bibliotheque', icon: 'resources', label: 'Bibliothèque' },
      { id: 'evenements', href: '/admin/evenements', icon: 'calendar', label: 'Événements' },
    ],
  },
  {
    title: 'Assistant IA — Yaye',
    items: [
      { id: 'yaye-metriques', href: '/admin/analytics/yaye', icon: 'chart', label: 'Métriques Yaye' },
      { id: 'yaye-escalades', href: '/admin/yaye/escalades', icon: 'bell', label: 'Escalades', urgent: true },
    ],
  },
  {
    title: 'Système',
    items: [
      { id: 'systeme', href: '/admin/systeme', icon: 'settings', label: 'Système & Exploitation' },
    ],
  },
]

/** Abrège un compteur pour le badge (22510 → "22.5k"). */
function fmtBadge(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

/** Tous les hrefs de nav — sert à ne garder actif que l'entrée la plus spécifique. */
const ALL_HREFS = SECTIONS.flatMap((s) => s.items.map((i) => i.href))

const STORAGE_KEY = 'gj-admin-sidebar-collapsed'

/* ── Styles partagés (inline — référencent uniquement les CSS vars admin) ─ */

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 9,
  color: 'var(--gj-admin-fg-40)',
  fontWeight: 800,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  padding: '15px 10px 5px',
}

const linkBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  padding: '8px 11px',
  borderRadius: 9,
  fontSize: 12.5,
  color: 'var(--gj-admin-fg-72)',
  fontWeight: 600,
  minHeight: 36,
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
  centresCount = null,
  usersCount = null,
  curationCount = null,
}: AdminSidebarProps) {
  const pathname = usePathname() ?? ''
  // Compteurs dynamiques par item (badge) : rouge (urgent, modération),
  // doré (escalades Yaye), muted (informatifs : centres, utilisateurs, curation).
  const itemCounts: Record<string, number | null> = {
    moderation: moderationCount,
    curation: curationCount,
    centres: centresCount,
    utilisateurs: usersCount,
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
        <span className="block w-5 h-0.5" style={{ background: 'var(--gj-admin-fg)' }} />
        <span className="block w-5 h-0.5" style={{ background: 'var(--gj-admin-fg)' }} />
        <span className="block w-5 h-0.5" style={{ background: 'var(--gj-admin-fg)' }} />
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
          h-screen flex flex-col transition-all duration-200
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
            style={{ height: 27, width: 'auto', filter: 'var(--gj-admin-logo-filter)' }}
          />
          {!collapsed && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: 'var(--gj-admin-gold-2)',
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
                      padding: collapsed ? '8px 0' : '8px 11px',
                      // Item actif : gradient doré --gj-admin-gold (rendu navigateur ;
                      // jsdom n'évalue pas var() sur le shorthand background).
                      ...(on ? linkActiveStyle : {}),
                    }}
                  >
                    <Icon name={item.icon} size={16} style={{ opacity: on ? 1 : 0.82 }} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {showBadge && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              background: item.urgent
                                ? 'var(--gj-admin-crit-dim)'
                                : item.tone === 'muted'
                                  ? 'var(--gj-admin-badge-muted-bg)'
                                  : 'var(--gj-admin-warn-dim)',
                              color: item.urgent
                                ? 'var(--gj-admin-crit)'
                                : item.tone === 'muted'
                                  ? 'var(--gj-admin-fg-60)'
                                  : 'var(--gj-admin-warn)',
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '1px 7px',
                              borderRadius: 999,
                            }}
                          >
                            {fmtBadge(badgeCount as number)}
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
          {/* Statut compact + carte utilisateur en pied (façon maquette) */}
          {!collapsed && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  color: 'var(--gj-admin-fg-60)',
                  padding: '2px 4px',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--gj-admin-good)',
                    flexShrink: 0,
                    boxShadow: '0 0 0 3px rgba(59,214,139,.15)',
                  }}
                />
                Services opérationnels
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 7, borderRadius: 9 }}>
                <span
                  aria-hidden
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: 'var(--gj-admin-gold)',
                    color: 'var(--gj-admin-on-gold)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 11.5,
                  }}
                >
                  {userInitials}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, color: 'var(--gj-admin-fg)' }}>{userName}</div>
                  <div style={{ fontSize: 10, color: 'var(--gj-admin-fg-60)', marginTop: 1 }}>{userRole}</div>
                </div>
              </div>
            </>
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
