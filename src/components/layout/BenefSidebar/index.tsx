'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import * as nav from 'next/navigation'
import { usePathname, useSearchParams } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/Icon'
import { getProfilePhotoUrl } from '@/lib/avatar/profile-photo'

export interface BenefSidebarItem {
  id: string
  href: string
  icon: IconName
  label: string
  /** Badge optionnel (count ou texte court). */
  badge?: string | number
  /** Badge muted (compteur indicatif) vs vif (alerte). */
  badgeMuted?: boolean
  /** Lien externe (ouvre dans un nouvel onglet, rendu avec <a> au lieu de <Link>). */
  external?: boolean
}

export interface BenefSidebarSection {
  title?: string
  items: BenefSidebarItem[]
}

export interface BenefSidebarProps {
  /** ID de l'item actif. */
  active?: string
  /** Sections personnalisées (défaut fourni). */
  sections?: BenefSidebarSection[]
  userName?: string
  userMeta?: string
  userInitials?: string
  /** GUIC-369 — affiche la photo de profil via proxy `/api/profil/photo/file`. */
  cjsUid?: string | null
  /** GUIC-447 — true si une photo existe ; sinon pas de requête proxy (→ initiales). */
  hasPhoto?: boolean
  /**
   * @deprecated GUIC-376 — le CTA Yaye n'ouvre plus une page mais le drawer
   * `YayeSidePanel` via `YayeProvider`. Prop conservée pour compat ascendante,
   * elle est désormais ignorée.
   */
  yayeHref?: string
  /**
   * @deprecated GUIC-658 — le bouton Notifications a quitté le footer de la
   * sidebar (la cloche BenefTopBar reste le point d'accès). Props conservées
   * pour compat ascendante, désormais ignorées.
   */
  unread?: number
  /** @deprecated GUIC-658 — cf `unread`. */
  onBellClick?: () => void
  /** GUIC-373 — handler bouton déconnexion. Si absent : `router.push('/auth/deconnexion')`. */
  onLogoutClick?: () => void
}

const DEFAULT_SECTIONS: BenefSidebarSection[] = [
  {
    items: [
      { id: 'home', href: '/jeune/tableau-de-bord', icon: 'home', label: 'Accueil' },
    ],
  },
  // GUIC-416 — conformité Lot 3 : la section Opportunités expose les
  // sous-types (Emploi & Stages, Bourses & Financement, Formations,
  // Concours & Appels) en raccourci, en plus de « Toutes » et
  // « Mes favoris ». Les sous-items pointent vers /opportunites?type=…
  // (filtre serveur déjà géré par OpportunitesClient via searchParams).
  // Pas de badge count : compteur agrégé non disponible (cf. ticket).
  {
    title: 'Opportunités',
    items: [
      { id: 'opp-all', href: '/opportunites', icon: 'target', label: 'Toutes' },
      { id: 'opp-emploi', href: '/opportunites?type=Emploi', icon: 'employment', label: 'Emploi & Stages' },
      { id: 'opp-bourse', href: '/opportunites?type=Bourse', icon: 'funding', label: 'Bourses & Financement' },
      { id: 'opp-formation', href: '/opportunites?type=Formation', icon: 'learning', label: 'Formations' },
      { id: 'opp-concours', href: '/opportunites?type=Appel_a_projets', icon: 'trending', label: 'Concours & Appels' },
      { id: 'favoris', href: '/jeune/mes-favoris', icon: 'bookmark', label: 'Mes favoris' },
    ],
  },
  {
    title: 'Mon parcours',
    items: [
      { id: 'candidatures', href: '/jeune/mes-candidatures', icon: 'document', label: 'Mes candidatures' },
      { id: 'messagerie', href: '/jeune/messagerie', icon: 'chat', label: 'Messagerie' },
      { id: 'formations', href: '/jeune/mes-formations', icon: 'document', label: 'Mes formations' },
      { id: 'agenda', href: '/agenda', icon: 'calendar', label: 'Agenda' },
      { id: 'centres', href: '/centres', icon: 'pin', label: 'Centres CJS' },
      { id: 'bibliotheque', href: '/jeune/bibliotheque', icon: 'resources', label: 'Bibliothèque' },
      { id: 'ressources', href: '/ressources', icon: 'document', label: 'Ressources' },
    ],
  },
  // GUIC-376 — "Mon compte > Mon profil" supprimé : la carte profil en haut
  // de la sidebar est désormais l'unique point d'accès à `/jeune/mon-profil`.
  // GUIC-658 — section « Plateformes partenaires » (YEAH, E-learning)
  // supprimée : sidebar épurée, le pied est réservé à l'accessibilité.
]

/**
 * Découpe un href "/path?query" en [path, query].
 */
function splitHref(href: string): { path: string; query: string } {
  const i = href.indexOf('?')
  return i < 0
    ? { path: href, query: '' }
    : { path: href.slice(0, i), query: href.slice(i + 1) }
}

/**
 * Détermine l'id de l'item actif à partir du pathname + searchParams courants.
 * - Match exact path + query (ex. /opportunites?type=Emploi) en priorité absolue
 * - Sinon match exact pathname (href sans query)
 * - Sinon match préfixe sur href (hors `/`)
 *
 * GUIC-416 — la section Opportunités expose plusieurs items partageant le
 * même pathname `/opportunites` mais différenciés par `?type=…`. On
 * privilégie le match query exact, puis on retombe sur l'item « Toutes »
 * (`/opportunites` sans query) si aucun type n'est passé.
 */
function resolveActiveId(
  pathname: string,
  searchParams: URLSearchParams,
  sections: BenefSidebarSection[],
): string | undefined {
  const items = sections.flatMap(s => s.items)

  // 1. Match exact path + query
  const currentType = searchParams.get('type') ?? ''
  const queryHit = items.find(it => {
    const { path, query } = splitHref(it.href)
    if (path !== pathname || !query) return false
    const itemType = new URLSearchParams(query).get('type') ?? ''
    return itemType === currentType && itemType !== ''
  })
  if (queryHit) return queryHit.id

  // 2. Match exact pathname (item sans query — ex. « Toutes »)
  //    On ne le retient que si aucun `type` n'est présent dans l'URL,
  //    sinon un sous-item plus précis aurait dû matcher au 1.
  if (!currentType) {
    const exact = items.find(it => {
      const { path, query } = splitHref(it.href)
      return path === pathname && !query
    })
    if (exact) return exact.id
  }

  // 3. Match préfixe — privilégier le href le plus long
  const candidates = items
    .filter(it => {
      const { path } = splitHref(it.href)
      return path !== '/' && pathname.startsWith(path + '/')
    })
    .sort((a, b) => b.href.length - a.href.length)
  return candidates[0]?.id
}

/**
 * BenefSidebar — sidebar gauche web bénéficiaire (≥1024px).
 *
 * Conforme `design-guichet-v2/web-dashboard.jsx` BenefSidebar :
 * - Logo Guichet + sous-titre "Mon espace"
 * - User chip (avatar initiales + nom + meta + chevron)
 * - Sections nav (Accueil / Opportunités / Parcours / Compte)
 * - Footer Yaye CTA permanent (lien vers /jeune/yaye)
 * - 260px largeur, bg-white, border-right
 *
 * Sur mobile (<1024px) : caché (BottomNav prend le relais).
 */
export function BenefSidebar({
  active,
  sections = DEFAULT_SECTIONS,
  userName,
  userMeta,
  userInitials,
  cjsUid,
  hasPhoto = false,
  // GUIC-376 — `yayeHref` est désormais ignoré (déprécié).
  yayeHref: _yayeHref,
  // GUIC-658 — `unread`/`onBellClick` ignorés (Notifications hors footer).
  unread: _unread,
  onBellClick: _onBellClick,
  onLogoutClick,
}: BenefSidebarProps) {
  // `usePathname()` peut retourner null hors contexte router — fallback sur '/'.
  const pathname = usePathname() ?? '/'
  // GUIC-416 — searchParams nécessaires pour résoudre l'item actif quand
  // plusieurs items partagent le même pathname (`/opportunites?type=…`).
  // `useSearchParams` peut retourner null hors contexte → fallback vide.
  const searchParams = useSearchParams() ?? new URLSearchParams()
  // `useRouter` peut être indisponible dans certains tests qui ne mockent
  // que `usePathname` (cf. tests/unit/benef-sidebar.test.tsx). On guard.
  const router = typeof nav.useRouter === 'function' ? nav.useRouter() : null
  const activeId = active ?? resolveActiveId(pathname, searchParams, sections)
  const photoUrl = getProfilePhotoUrl(cjsUid ?? undefined, hasPhoto)
  const [photoOk, setPhotoOk] = useState<boolean>(Boolean(photoUrl))
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    if (loggingOut) return
    setLoggingOut(true)
    if (onLogoutClick) onLogoutClick()
    else if (router) router.push('/auth/deconnexion')
    else window.location.assign('/auth/deconnexion')
  }

  return (
    <aside
      role="navigation"
      aria-label="Navigation principale"
      className="hidden lg:flex"
      style={{
        width: 260,
        background: 'var(--gj-surface)',
        borderRight: '1px solid var(--gj-line)',
        padding: '16px 12px',
        height: '100%',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 6,
          padding: '4px 6px 16px',
        }}
      >
        <Image
          src="/logo-guichet.png"
          alt="Guichet Jeunesse.sn"
          width={120}
          height={30}
          style={{ height: 30, width: 'auto' }}
        />
        <div
          style={{
            fontSize: 9.5,
            color: 'var(--gj-teal-deep)',
            letterSpacing: '.5px',
            textTransform: 'uppercase',
            fontWeight: 800,
          }}
        >
          Mon espace
        </div>
      </div>

      {/* User chip */}
      {userName || userInitials ? (
        <Link
          href="/jeune/mon-profil"
          className="no-underline"
          style={{
            background: 'var(--gj-bg)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
            color: 'var(--gj-ink)',
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
              color: 'var(--gj-surface)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {photoUrl && photoOk ? (
              <Image
                src={photoUrl}
                alt={userName ?? 'Photo de profil'}
                width={36}
                height={36}
                unoptimized
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setPhotoOk(false)}
              />
            ) : (
              userInitials ?? ''
            )}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 800,
                color: 'var(--gj-ink)',
                lineHeight: 1.2,
              }}
            >
              {userName}
            </span>
            {userMeta ? (
              <span
                style={{
                  display: 'block',
                  fontSize: 10.5,
                  color: 'var(--gj-grey)',
                  marginTop: 2,
                }}
              >
                {userMeta}
              </span>
            ) : null}
          </span>
          <Icon name="chevron-right" size={13} />
        </Link>
      ) : null}

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <div key={section.title ?? `section-${sIdx}`}>
          {section.title ? (
            <div
              style={{
                fontSize: 9.5,
                color: 'var(--gj-grey)',
                fontWeight: 800,
                letterSpacing: '.4px',
                textTransform: 'uppercase',
                padding: '12px 10px 4px',
              }}
            >
              {section.title}
            </div>
          ) : null}
          {section.items.map(item => {
            const on = item.id === activeId
            const itemStyle = {
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 8,
              fontSize: 13,
              color: on ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
              fontWeight: on ? 800 : 600,
              minHeight: 38,
              background: on ? 'var(--gj-teal-soft)' : 'transparent',
              width: '100%',
            } as const
            const inner = (
              <>
                <Icon name={item.icon} size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge ? (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: item.badgeMuted ? 'var(--gj-line)' : 'var(--gj-red)',
                      color: item.badgeMuted ? 'var(--gj-grey)' : 'var(--gj-surface)',
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 10,
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
                {item.external ? (
                  <Icon
                    name="external"
                    size={12}
                    style={{ color: 'var(--gj-grey)', marginLeft: item.badge ? 4 : 'auto' }}
                  />
                ) : null}
              </>
            )
            if (item.external) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.label} (ouvre dans un nouvel onglet)`}
                  className="no-underline"
                  style={itemStyle}
                >
                  {inner}
                </a>
              )
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className="no-underline"
                style={itemStyle}
              >
                {inner}
              </Link>
            )
          })}
        </div>
      ))}

      {/* GUIC-581/GUIC-658 — Inclusion & accessibilité : ancre visuelle du
          pied de sidebar (à la place de l'ex-CTA Yaye, redondant depuis
          GUIC-376). Carte gradient teal — même registre que le hero de la
          page dédiée. L'activation des réglages reste un choix réfléchi :
          la carte mène à /jeune/accessibilite, pas de panneau superposé. */}
      <Link
        href="/jeune/accessibilite"
        aria-label="Inclusion & accessibilité"
        aria-current={pathname === '/jeune/accessibilite' ? 'page' : undefined}
        data-variant="cta"
        className="no-underline"
        style={{
          marginTop: 'auto',
          padding: '12px 12px',
          backgroundColor: 'var(--gj-teal-deep)',
          backgroundImage:
            'linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal, var(--gj-ink)))',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          width: '100%',
          minHeight: 'var(--tap-min)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow:
            pathname === '/jeune/accessibilite'
              ? '0 0 0 2px var(--gj-yellow)'
              : 'none',
        }}
      >
        {/* halo jaune discret, même registre que le hero de la page */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: -30,
            top: -40,
            width: 120,
            height: 120,
            background:
              'radial-gradient(circle, rgba(249,196,0,.22), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <span
          aria-hidden
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            flexShrink: 0,
            background: 'rgba(255,255,255,.18)',
            color: 'var(--gj-yellow)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Icon name="eye" size={22} />
        </span>
        <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25, position: 'relative' }}>
          {/* GUIC-658 — lisibilité renforcée (retour PO) : blanc pur + tailles
              relevées, la carte est l'ancre du pied de sidebar. */}
          <span
            style={{
              display: 'block',
              fontSize: 14.5,
              fontWeight: 900,
              color: '#FFFFFF',
            }}
          >
            Inclusion & accessibilité
          </span>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              opacity: 0.92,
              marginTop: 3,
            }}
          >
            Adapter l&apos;application à tes besoins
          </span>
        </span>
        <span style={{ color: 'var(--gj-yellow)', position: 'relative', flexShrink: 0 }}>
          <Icon name="chevron-right" size={17} />
        </span>
      </Link>

      {/* GUIC-376 — Footer compte, séparé par un border-top.
          GUIC-658 — Notifications retiré (la cloche BenefTopBar reste le
          point d'accès) : seul Se déconnecter demeure. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--gj-line)',
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Se déconnecter"
          className="no-underline benef-sidebar-logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 10px',
            borderRadius: 8,
            fontSize: 13,
            // GUIC-411 — action destructive : couleur gj-red explicite + hover renforcé via classe.
            color: 'var(--gj-red)',
            fontWeight: 700,
            minHeight: 'var(--tap-min)',
            background: 'transparent',
            border: 0,
            cursor: loggingOut ? 'wait' : 'pointer',
            width: '100%',
            textAlign: 'left',
            opacity: loggingOut ? 0.6 : 1,
          }}
        >
          <Icon name="logout" size={18} />
          <span style={{ flex: 1 }}>
            {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </span>
        </button>
      </div>
    </aside>
  )
}
