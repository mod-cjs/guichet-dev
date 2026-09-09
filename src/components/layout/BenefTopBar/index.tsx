'use client'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { buildBreadcrumbs } from './buildBreadcrumbs'

/**
 * GUIC-375 — Recherche contextuelle : on redirige vers la liste correspondant
 * à la page consultée (`/ressources?q=`, `/agenda?q=`, `/centres?q=`), avec
 * fallback `/opportunites?q=` sinon. Évite de toujours sortir le jeune du
 * contexte (ex. il cherche un mot dans `/ressources` → reste sur ressources).
 */
function resolveSearchTarget(pathname: string | null, q: string): string {
  const encoded = encodeURIComponent(q)
  if (!pathname) return `/opportunites?q=${encoded}`
  if (pathname.startsWith('/ressources') || pathname.startsWith('/jeune/ressources'))
    return `/ressources?q=${encoded}`
  if (pathname.startsWith('/agenda') || pathname.startsWith('/jeune/agenda'))
    return `/agenda?q=${encoded}`
  if (pathname.startsWith('/centres') || pathname.startsWith('/jeune/centres'))
    return `/centres?q=${encoded}`
  return `/opportunites?q=${encoded}`
}

export interface BenefTopBarProps {
  /** Valeur (controlled) du champ recherche. */
  searchQuery?: string
  /** Callback recherche (controlled). */
  onSearchChange?: (value: string) => void
  /** Callback submit — si absent, navigue vers /opportunites?q=<query>. */
  onSearchSubmit?: (value: string) => void
  /** Placeholder du champ recherche. */
  searchPlaceholder?: string
  /** Nombre de notifications non lues (badge sur la cloche). */
  unread?: number
  /** Callback clic sur la cloche notifications. */
  onBellClick?: () => void
  /** Callback clic sur l'icône aide. */
  onInfoClick?: () => void
}

/**
 * BenefTopBar — top bar web bénéficiaire (≥1024px).
 *
 * GUIC-413 — version minimale : seules les actions essentielles à droite.
 * - Search bar large (max 520px) + icon search + raccourci ⌘K
 * - Fil d'Ariane contextuel (GUIC-402)
 * - Zone droite : cloche notifications (badge unread, plafonné `99+`) + aide
 *
 * Favoris, profil/déconnexion et Yaye sont accessibles depuis la sidebar
 * (ou via FAB pour Yaye) — pas dans la topbar.
 *
 * Visible ≥1024px — l'AppTopbar mobile prend le relais en-dessous.
 */
export function BenefTopBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Rechercher une opportunité, un centre, un atelier…',
  unread = 0,
  onBellClick,
  onInfoClick,
}: BenefTopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isControlled = typeof searchQuery === 'string'
  // GUIC-378 : la searchbar lit ?q= de l'URL pour rester remplie après navigation.
  const [internalQuery, setInternalQuery] = useState(() => searchParams?.get('q') ?? '')
  // Re-sync si le param URL change (navigation côté client).
  useEffect(() => {
    if (!isControlled) setInternalQuery(searchParams?.get('q') ?? '')
  }, [searchParams, isControlled])
  const value = isControlled ? searchQuery : internalQuery
  const handleChange = (v: string) => {
    if (!isControlled) setInternalQuery(v)
    onSearchChange?.(v)
  }
  const crumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname])
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (value ?? '').trim()
    if (onSearchSubmit) {
      onSearchSubmit(q)
      return
    }
    if (q.length === 0) return
    router.push(resolveSearchTarget(pathname, q))
  }

  return (
    <header
      role="banner"
      className="hidden lg:flex sticky top-0"
      style={{
        background: 'var(--gj-surface)',
        borderBottom: '1px solid var(--gj-line)',
        padding: '10px 24px',
        alignItems: 'center',
        gap: 14,
        minHeight: 'var(--gj-topbar-h)',
        flexShrink: 0,
        zIndex: 'var(--gj-z-nav)',
      }}
    >
      {/* Search — GUIC-373 : seule action conservée sur desktop. Avatar /
          notifications / aide / Yaye ont migré dans la sidebar ou en FAB. */}
      <form
        role="search"
        onSubmit={handleSubmit}
        style={{
          flex: 1,
          maxWidth: 520,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--gj-bg)',
          border: '1.5px solid var(--gj-line)',
          borderRadius: 10,
          padding: '0 14px',
          minHeight: 44,
        }}
      >
        <Icon name="search" size={16} style={{ color: 'var(--gj-grey)' }} />
        <input
          type="search"
          name="q"
          value={value ?? ''}
          onChange={e => handleChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Rechercher"
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: 'transparent',
            fontSize: 14,
            fontFamily: 'inherit',
            color: 'var(--gj-ink)',
          }}
        />
        <kbd
          aria-hidden
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 'var(--fs-100)',
            background: 'var(--gj-surface)',
            border: '1px solid var(--gj-line)',
            borderRadius: 4,
            padding: '1px 5px',
            color: 'var(--gj-grey-2)',
          }}
        >
          ⌘ K
        </kbd>
        {/* Submit invisible pour soumettre via Enter (a11y form natif). */}
        <button type="submit" aria-label="Lancer la recherche" style={{ display: 'none' }} />
      </form>

      {/* GUIC-402 — fil d'Ariane contextuel desktop pour combler l'espace droit
          et offrir un repère de navigation hiérarchique. Masqué <lg. */}
      <nav
        aria-label="Fil d'Ariane"
        className="hidden lg:flex"
        style={{
          flex: 1,
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--gj-grey)',
          minHeight: 44,
          paddingLeft: 8,
        }}
      >
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={crumb.href ?? crumb.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {i > 0 ? (
                <span aria-hidden style={{ color: 'var(--gj-line)' }}>›</span>
              ) : null}
              {/* GUIC-689 — `href: null` = dossier de regroupement sans page :
                  le repère hiérarchique reste affiché, mais sans lien mort. */}
              {isLast || crumb.href === null ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  style={{
                    color: isLast ? 'var(--gj-ink)' : 'var(--gj-grey)',
                    fontWeight: isLast ? 600 : 400,
                    padding: '10px 4px',
                  }}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="no-underline"
                  style={{
                    color: 'var(--gj-grey)',
                    padding: '10px 4px',
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

      {/* GUIC-413 — zone droite minimale : notifications + aide. Favoris,
          profil/déconnexion et Yaye ont migré sidebar / FAB. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginLeft: 'auto',
        }}
      >
        <button
          type="button"
          onClick={onBellClick}
          aria-label={
            unread > 0
              ? `Notifications, ${Math.min(unread, 99)}${unread > 99 ? '+' : ''} non lues`
              : 'Notifications'
          }
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
            minHeight: 44,
            padding: 10,
            background: 'transparent',
            border: 0,
            borderRadius: 8,
            color: 'var(--gj-ink)',
            cursor: 'pointer',
          }}
        >
          <Icon name="bell" size={20} />
          {unread > 0 ? (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 5,
                right: 3,
                minWidth: 18,
                height: 18,
                padding: '0 4px',
                borderRadius: 9,
                background: 'var(--gj-red)',
                color: 'var(--gj-surface)',
                fontSize: 'var(--fs-100)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onInfoClick}
          aria-label="Aide"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
            minHeight: 44,
            padding: 10,
            background: 'transparent',
            border: 0,
            borderRadius: 8,
            color: 'var(--gj-ink)',
            cursor: 'pointer',
          }}
        >
          <Icon name="help" size={20} />
        </button>
      </div>
    </header>
  )
}
