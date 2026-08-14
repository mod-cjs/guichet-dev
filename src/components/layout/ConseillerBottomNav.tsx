'use client'

/**
 * GUIC-502 (US-10) — Bottom-nav mobile de l'Espace conseiller (design v4 `agent-mobile.jsx`).
 * 5 items : Accueil · Résa · Scan · Messages · Plus. « Plus » ouvre un sheet avec
 * les écrans secondaires. Mobile uniquement (`md:hidden`) ; le desktop garde la sidebar.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { lienMasque } from '@/lib/flags/ui'
import { Icon, type IconName } from '@/components/ui/Icon'

interface NavItem { href: string; icon: IconName; label: string }

const PRIMARY: NavItem[] = [
  { href: '/conseiller', icon: 'home', label: 'Accueil' },
  { href: '/conseiller/reservations', icon: 'calendar', label: 'Résa' },
  { href: '/conseiller/checkin', icon: 'target', label: 'Scan' },
  { href: '/conseiller/messagerie', icon: 'chat', label: 'Messages' },
]

const SECONDARY: NavItem[] = [
  { href: '/conseiller/agenda', icon: 'clock', label: 'Agenda & RDV' },
  { href: '/conseiller/beneficiaires', icon: 'users', label: 'Bénéficiaires' },
  { href: '/conseiller/bibliotheque', icon: 'learning', label: 'Bibliothèque' },
  { href: '/conseiller/publications', icon: 'employment', label: 'Publications' },
  { href: '/conseiller/notifications', icon: 'bell', label: 'Notifications' },
  { href: '/conseiller/parametres', icon: 'settings', label: 'Paramètres' },
]

const H = 64
const ACTIVE = 'var(--gj-teal-deep)'

export function ConseillerBottomNav({ reservationsBadge = 0, messagesBadge = 0, masques = [] }: { reservationsBadge?: number; messagesBadge?: number; masques?: readonly string[] } = {}) {
  const badgeFor = (href: string) =>
    href === '/conseiller/reservations' ? reservationsBadge : href === '/conseiller/messagerie' ? messagesBadge : 0
  const pathname = usePathname() ?? ''
  // GUIC-706 — les deux niveaux sont filtrés : un item masqué ne doit pas se réfugier
  // dans le menu « Plus », qui est une navigation comme une autre.
  const primaires = PRIMARY.filter((i) => !lienMasque(i.href, masques))
  const secondaires = SECONDARY.filter((i) => !lienMasque(i.href, masques))
  const [plus, setPlus] = useState(false)
  const close = useCallback(() => setPlus(false), [])

  useEffect(() => {
    if (!plus) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlus(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plus])

  useEffect(() => { setPlus(false) }, [pathname])

  const isActive = (href: string) =>
    href === '/conseiller' ? pathname === '/conseiller' : pathname === href || pathname.startsWith(href + '/')
  const plusActive = SECONDARY.some((s) => isActive(s.href))

  const itemStyle = (on: boolean): React.CSSProperties => ({
    flex: 1, background: 'transparent', border: 0, cursor: 'pointer', textDecoration: 'none',
    padding: '9px 0 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    color: on ? ACTIVE : 'var(--gj-grey)', fontWeight: on ? 800 : 600, fontSize: 10.5,
  })

  const Badge = ({ n }: { n: number }) =>
    n > 0 ? (
      <span aria-hidden style={{ position: 'absolute', top: -5, right: -8, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--gj-red)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {n > 9 ? '9+' : n}
      </span>
    ) : null

  return (
    <>
      {plus && <div className="md:hidden fixed inset-0 z-[280]" onClick={close} aria-hidden style={{ background: 'rgba(0,0,0,.4)' }} />}
      {plus && (
        <div
          role="menu" aria-label="Plus"
          className="md:hidden fixed left-0 right-0 z-[290]"
          style={{ bottom: H, background: '#fff', borderTop: '1px solid var(--gj-line)', borderRadius: '16px 16px 0 0', padding: '10px 12px calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div style={{ height: 4, width: 36, borderRadius: 2, background: 'var(--gj-line)', margin: '2px auto 10px' }} aria-hidden />
          {secondaires.map((s) => (
            <Link key={s.href} href={s.href} onClick={close} role="menuitem" className="no-underline flex items-center gap-[12px]" style={{ padding: '12px 8px', color: isActive(s.href) ? ACTIVE : 'var(--gj-ink)', fontWeight: isActive(s.href) ? 800 : 600, fontSize: 14, borderBottom: '1px solid var(--gj-line)' }}>
              <Icon name={s.icon} size={18} /> {s.label}
            </Link>
          ))}
          <Link href="/api/auth/logout" onClick={close} role="menuitem" className="no-underline flex items-center gap-[12px]" style={{ padding: '12px 8px', color: 'var(--gj-grey)', fontWeight: 600, fontSize: 14 }}>
            <Icon name="logout" size={18} /> Se déconnecter
          </Link>
        </div>
      )}

      <nav
        aria-label="Navigation conseiller"
        className="md:hidden fixed left-0 right-0 z-[270] flex"
        style={{ bottom: 0, height: `calc(${H}px + env(safe-area-inset-bottom, 0px))`, paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: '#fff', borderTop: '1px solid var(--gj-line)' }}
      >
        {primaires.map((it) => {
          const on = isActive(it.href)
          return (
            <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined} style={{ ...itemStyle(on), position: 'relative' }}>
              <span style={{ position: 'relative' }}>
                <Icon name={it.icon} size={20} />
                <Badge n={badgeFor(it.href)} />
              </span>
              {it.label}
            </Link>
          )
        })}
        <button type="button" onClick={() => setPlus((p) => !p)} aria-expanded={plus} aria-label="Plus de sections" style={{ ...itemStyle(plusActive || plus) }}>
          <Icon name="more-vertical" size={20} />
          Plus
        </button>
      </nav>
    </>
  )
}
