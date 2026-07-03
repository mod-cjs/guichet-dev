'use client'

/**
 * GUIC-492 (US-10) — Bottom-nav mobile de l'Espace Recruteur (design v4 `recruteur-mobile.jsx`).
 * 5 items : Accueil · Offres · Candidats · Messages · Plus. « Plus » ouvre un sheet avec
 * les écrans secondaires. Mobile uniquement (`md:hidden`) ; le desktop garde la sidebar.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

interface NavItem { href: string; icon: IconName; label: string }

const PRIMARY: NavItem[] = [
  { href: '/recruteur/tableau-de-bord', icon: 'home', label: 'Accueil' },
  { href: '/recruteur/mes-offres', icon: 'employment', label: 'Offres' },
  { href: '/recruteur/candidatures', icon: 'target', label: 'Candidats' },
  { href: '/recruteur/messagerie', icon: 'chat', label: 'Messages' },
]

const SECONDARY: NavItem[] = [
  { href: '/recruteur/profil-entreprise', icon: 'users', label: 'Profil entreprise' },
  { href: '/recruteur/notifications', icon: 'bell', label: 'Notifications' },
  { href: '/recruteur/entretiens', icon: 'calendar', label: 'Entretiens' },
  { href: '/recruteur/parametres', icon: 'settings', label: 'Paramètres' },
]

const H = 64

export function RecruteurBottomNav({ candidatsBadge = 0, messagesBadge = 0 }: { candidatsBadge?: number; messagesBadge?: number } = {}) {
  const badgeFor = (href: string) =>
    href === '/recruteur/candidatures' ? candidatsBadge : href === '/recruteur/messagerie' ? messagesBadge : 0
  const pathname = usePathname() ?? ''
  const [plus, setPlus] = useState(false)
  const close = useCallback(() => setPlus(false), [])

  useEffect(() => {
    if (!plus) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlus(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plus])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const plusActive = SECONDARY.some((s) => isActive(s.href))

  const itemStyle = (on: boolean): React.CSSProperties => ({
    flex: 1, background: 'transparent', border: 0, cursor: 'pointer', textDecoration: 'none',
    padding: '9px 0 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    color: on ? 'var(--gj-blue-ink, #1A3FA8)' : 'var(--gj-grey)', fontWeight: on ? 800 : 600, fontSize: 10.5,
  })

  return (
    <>
      {/* Sheet « Plus » */}
      {plus && (
        <div className="md:hidden fixed inset-0 z-[280]" onClick={close} aria-hidden style={{ background: 'rgba(0,0,0,.4)' }} />
      )}
      {plus && (
        <div
          role="menu" aria-label="Plus"
          className="md:hidden fixed left-0 right-0 z-[290]"
          style={{ bottom: H, background: '#fff', borderTop: '1px solid var(--gj-line)', borderRadius: '16px 16px 0 0', padding: '10px 12px calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div style={{ height: 4, width: 36, borderRadius: 2, background: 'var(--gj-line)', margin: '2px auto 10px' }} aria-hidden />
          {SECONDARY.map((s) => (
            <Link key={s.href} href={s.href} onClick={close} role="menuitem" className="no-underline flex items-center gap-[12px]" style={{ padding: '12px 8px', color: isActive(s.href) ? 'var(--gj-blue-ink, #1A3FA8)' : 'var(--gj-ink)', fontWeight: isActive(s.href) ? 800 : 600, fontSize: 14, borderBottom: '1px solid var(--gj-line)' }}>
              <Icon name={s.icon} size={18} /> {s.label}
            </Link>
          ))}
          <Link href="/api/auth/logout" onClick={close} role="menuitem" className="no-underline flex items-center gap-[12px]" style={{ padding: '12px 8px', color: 'var(--gj-grey)', fontWeight: 600, fontSize: 14 }}>
            <Icon name="external" size={18} /> Se déconnecter
          </Link>
        </div>
      )}

      {/* Barre fixe */}
      <nav
        aria-label="Navigation recruteur"
        className="md:hidden fixed left-0 right-0 z-[270] flex"
        style={{ bottom: 0, height: `calc(${H}px + env(safe-area-inset-bottom, 0px))`, paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: '#fff', borderTop: '1px solid var(--gj-line)' }}
      >
        {PRIMARY.map((it) => {
          const on = isActive(it.href)
          const badge = badgeFor(it.href)
          return (
            <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined} style={{ ...itemStyle(on), position: 'relative' }}>
              <span style={{ position: 'relative' }}>
                <Icon name={it.icon} size={20} />
                {badge > 0 && <span aria-hidden style={{ position: 'absolute', top: -5, right: -9, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8, background: 'var(--gj-red, #DC2626)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{badge > 9 ? '9+' : badge}</span>}
              </span>
              {it.label}
            </Link>
          )
        })}
        <button type="button" onClick={() => setPlus((v) => !v)} aria-expanded={plus} aria-label="Plus" style={itemStyle(plus || plusActive)}>
          <Icon name="menu" size={20} />
          Plus
        </button>
      </nav>
    </>
  )
}
