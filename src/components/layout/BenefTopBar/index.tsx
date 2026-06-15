'use client'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import * as Nav from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { UserMenu } from '@/components/layout/UserMenu'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { YayeSidePanel } from '@/components/ui/Yaye/YayeSidePanel'

/**
 * GUIC-402 — Mapping des segments d'URL vers labels lisibles pour breadcrumbs.
 * Couvre l'app jeune `/jeune/*` ; la racine `/jeune` est libellée « Mon espace ».
 */
const SEGMENT_LABELS: Record<string, string> = {
  jeune: 'Mon espace',
  'mes-favoris': 'Mes favoris',
  'mes-candidatures': 'Mes candidatures',
  'mon-profil': 'Mon profil',
  'mes-notifications': 'Mes notifications',
  parametres: 'Paramètres',
  opportunites: 'Opportunités',
  agenda: 'Agenda',
  ressources: 'Ressources',
  centres: 'Centres',
  yaye: 'Yaye',
}

interface Crumb {
  label: string
  href: string
}

/**
 * Construit un fil d'Ariane à partir du pathname. Limité à 3 niveaux pour rester
 * lisible. Renvoie [] si pathname ne correspond pas à l'app jeune.
 */
function buildBreadcrumbs(pathname: string | null): Crumb[] {
  if (!pathname || !pathname.startsWith('/jeune')) return []
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = []
  let acc = ''
  for (const seg of segments) {
    acc += '/' + seg
    const label = SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
    crumbs.push({ label, href: acc })
  }
  return crumbs.slice(0, 3)
}

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
  /** Nombre de notifications non lues. */
  unread?: number
  /** Nombre de favoris sauvegardés. */
  bookmarkCount?: number
  /** Initiales utilisateur (affichées en bout de barre). */
  userInitials?: string
  /** Prénom utilisateur (passé au UserMenu). */
  userPrenom?: string
  /** Nom utilisateur (passé au UserMenu). */
  userNom?: string
  /** GUIC-369 — propagé au UserMenu pour afficher la photo via proxy. */
  cjsUid?: string | null
  /** Callbacks pour chaque action. */
  onBookmarkClick?: () => void
  onBellClick?: () => void
  onInfoClick?: () => void
  /** @deprecated — l'avatar ouvre désormais un `UserMenu`. */
  onUserClick?: () => void
  /** Etat (controlled) du side panel Yaye. Si omis, l'état est géré en interne. */
  yayeOpen?: boolean
  /** Callback ouverture/fermeture Yaye (controlled). */
  onYayeOpenChange?: (open: boolean) => void
}

/**
 * BenefTopBar — top bar web bénéficiaire (≥1024px).
 *
 * Conforme `design-guichet-v2/web-dashboard.jsx` BenefTopBar :
 * - Search bar large (max 520px) + icon search + raccourci ⌘K
 * - Breadcrumbs contextuels (GUIC-402)
 * - Boutons droite : favoris (bookmark + count), cloche (unread badge),
 *   aide (info), Yaye trigger, UserMenu (profil + déconnexion)
 * - Sticky top, h-16, bg-white, border-bottom
 *
 * Visible ≥1024px — l'AppTopbar mobile prend le relais en-dessous.
 *
 * GUIC-410 — restaure la zone droite supprimée par mégarde dans GUIC-402.
 */
export function BenefTopBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Rechercher une opportunité, un centre, un atelier…',
  unread = 0,
  bookmarkCount = 0,
  userInitials,
  userPrenom = '',
  userNom = '',
  cjsUid,
  onBookmarkClick,
  onBellClick,
  onInfoClick,
  onUserClick,
  yayeOpen: yayeOpenProp,
  onYayeOpenChange,
}: BenefTopBarProps) {
  // Conservé pour rétrocompat — le menu utilisateur a remplacé le simple click.
  void onUserClick

  // Defensive : certains tests mockent uniquement `useRouter` et laissent les
  // autres hooks `undefined`. On no-op proprement si absent.
  const router = Nav.useRouter()
  const pathname = typeof Nav.usePathname === 'function' ? Nav.usePathname() : null
  const searchParams =
    typeof Nav.useSearchParams === 'function' ? Nav.useSearchParams() : null
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

  // Yaye side panel — controlled si prop fournie, sinon état interne.
  const [yayeOpenInternal, setYayeOpenInternal] = useState(false)
  const isYayeControlled = yayeOpenProp !== undefined
  const yayeOpen = isYayeControlled ? (yayeOpenProp as boolean) : yayeOpenInternal
  const setYayeOpen = (next: boolean) => {
    if (!isYayeControlled) setYayeOpenInternal(next)
    onYayeOpenChange?.(next)
  }

  const handleBookmark = () => {
    if (onBookmarkClick) {
      onBookmarkClick()
      return
    }
    router.push('/jeune/mes-favoris')
  }

  return (
    <>
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
        {/* Search */}
        <form
          role="search"
          onSubmit={handleSubmit}
          style={{
            flex: '0 1 520px',
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
              fontSize: 10,
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

        {/* GUIC-402 — fil d'Ariane contextuel desktop. */}
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
              <span key={crumb.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {i > 0 ? (
                  <span aria-hidden style={{ color: 'var(--gj-line)' }}>›</span>
                ) : null}
                {isLast ? (
                  <span
                    aria-current="page"
                    style={{ color: 'var(--gj-ink)', fontWeight: 600, padding: '10px 4px' }}
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

        {/* GUIC-410 — zone droite restaurée. */}

        {/* Bookmark */}
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={
            bookmarkCount > 0
              ? `Mes favoris (${bookmarkCount} sauvegardés)`
              : 'Mes favoris'
          }
          style={iconBtn}
        >
          <Icon name="bookmark" size={18} />
          {bookmarkCount > 0 ? (
            <span style={countBadge('var(--gj-teal-deep)')}>{bookmarkCount}</span>
          ) : null}
        </button>

        {/* Bell — notifications */}
        <button
          type="button"
          onClick={onBellClick}
          aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
          style={iconBtn}
        >
          <Icon name="bell" size={18} />
          {unread > 0 ? (
            <span style={countBadge('var(--gj-red)')}>{unread > 99 ? '99+' : unread}</span>
          ) : null}
        </button>

        {/* Aide */}
        <button type="button" onClick={onInfoClick} aria-label="Aide" style={iconBtn}>
          <Icon name="help" size={18} />
        </button>

        {/* Yaye trigger */}
        <button
          type="button"
          onClick={() => setYayeOpen(!yayeOpen)}
          aria-label="Ouvrir la conversation avec Yaye"
          aria-haspopup="dialog"
          aria-expanded={yayeOpen}
          style={{
            ...iconBtn,
            background: 'transparent',
            border: 0,
            padding: 0,
          }}
        >
          <YayeAvatar size={32} withBadge />
        </button>

        {/* UserMenu — profil + déconnexion */}
        <UserMenu
          initials={userInitials ?? ''}
          prenom={userPrenom}
          nom={userNom}
          cjsUid={cjsUid ?? null}
        />
      </header>
      <YayeSidePanel open={yayeOpen} onClose={() => setYayeOpen(false)} />
    </>
  )
}

const iconBtn = {
  width: 44,
  height: 44,
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  background: 'var(--gj-surface)',
  border: '1.5px solid var(--gj-line)',
  borderRadius: 10,
  color: 'var(--gj-grey)',
  cursor: 'pointer',
  position: 'relative' as const,
  flexShrink: 0,
}

function countBadge(bg: string) {
  return {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 999,
    background: bg,
    color: 'var(--gj-surface)',
    fontSize: 10,
    fontWeight: 800,
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    border: '2px solid var(--gj-surface)',
  }
}
