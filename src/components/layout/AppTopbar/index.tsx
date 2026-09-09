import Image from 'next/image'
import Link from 'next/link'
import { lienMasque } from '@/lib/flags/ui'
import { UserMenu } from '@/components/layout/UserMenu'
import { Icon } from '@/components/ui/Icon'
import type { CJSSession } from '@/types/user'

/**
 * AppTopbar v2 — top bar mobile bénéficiaire (refonte design v2).
 *
 * Conforme à `design-guichet-v2/phone.jsx` TopBar :
 * - Logo Guichet (asset `/logo-guichet.png`) + subtitle optionnel
 * - Cloche notifications avec badge unread
 * - Avatar utilisateur (initiales)
 * - Sticky top, bg-white, border-bottom, h-14
 *
 * Backward-compatible : accepte `session` (signature historique) OU les
 * props individuelles ; les actions reçoivent un callback côté client si
 * fourni, sinon un `<Link>` server.
 */
export interface AppTopbarProps {
  /**
   * GUIC-706 — clés masquées pour ce visiteur. La barre supérieure porte un raccourci
   * codé en dur vers les sauvegardes : c'est une navigation, elle doit se filtrer comme
   * les autres.
   */
  masques?: readonly string[]
  session?: CJSSession
  subtitle?: string
  userInitials?: string
  unread?: number
  /** GUIC-447 — true si l'utilisateur a une photo (sinon pas de requête proxy). */
  hasPhoto?: boolean
  onBellClick?: () => void
  onUserClick?: () => void
}

function deriveInitials(session?: CJSSession, explicit?: string): string {
  if (explicit) return explicit
  if (!session) return ''
  return (
    (session.prenom?.[0] ?? '').toUpperCase() +
    (session.nom?.[0] ?? '').toUpperCase()
  )
}

export function AppTopbar({
  masques = [],
  session,
  subtitle,
  userInitials,
  unread = 0,
  hasPhoto = false,
  onBellClick,
  onUserClick,
}: AppTopbarProps) {
  const initials = deriveInitials(session, userInitials)
  const hasUnread = unread > 0

  return (
    <header
      className="md:hidden sticky top-0 bg-white border-b border-gj-line flex-shrink-0"
      style={{ zIndex: 'var(--gj-z-nav)', paddingTop: 'var(--safe-top)' }}
    >
      <div className="flex items-center gap-2 px-3 h-14">
        {/* Logo + subtitle */}
        <Link
          href="/jeune/tableau-de-bord"
          className="flex items-center gap-2 no-underline min-w-0 flex-1"
          aria-label="Tableau de bord"
        >
          <Image
            src="/logo-guichet.png"
            alt="Guichet Jeunesse.sn"
            width={96}
            height={24}
            style={{ height: 24, width: 'auto' }}
            priority
          />
          {subtitle ? (
            <>
              <span
                aria-hidden
                style={{
                  width: 1.5,
                  height: 18,
                  background: 'var(--gj-line)',
                  flexShrink: 0,
                }}
              />
              <span
                className="truncate"
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'var(--gj-ink)',
                  letterSpacing: '-.1px',
                }}
              >
                {subtitle}
              </span>
            </>
          ) : null}
        </Link>

        {/* Actions droite */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* GUIC-689 — pastille Yaye RETIRÉE : règle non négociable du handoff
              v5, « un seul point d'entrée IA permanent par écran », et ce point
              d'entrée est le bouton flottant (design-guichet-v5/phone.jsx:106).
              Elle ouvrait en plus une expérience différente du FAB (page plein
              écran vs drawer). Voir tests/unit/yaye-point-entree-unique.test.tsx */}

          {/* Favoris (cœur) — accès rapide depuis le mobile (GUIC-367) */}
          {!lienMasque('/jeune/mes-favoris', masques) && (
          <Link
            href="/jeune/mes-favoris"
            aria-label="Mes favoris"
            className="relative inline-flex items-center justify-center no-underline"
            style={{
              minWidth: 'var(--tap-min)',
              minHeight: 'var(--tap-min)',
              color: 'var(--gj-ink)',
            }}
          >
            <Icon name="heart" size={20} />
          </Link>
          )}

          {/* Bell notifications */}
          {onBellClick ? (
            <button
              type="button"
              onClick={onBellClick}
              aria-label={hasUnread ? `Notifications (${unread} non lues)` : 'Notifications'}
              className="relative inline-flex items-center justify-center bg-transparent border-0 cursor-pointer"
              style={{
                minWidth: 'var(--tap-min)',
                minHeight: 'var(--tap-min)',
                color: 'var(--gj-ink)',
              }}
            >
              <Icon name="bell" size={20} />
              {hasUnread ? (
                <span
                  aria-hidden
                  className="absolute"
                  style={{
                    top: 7,
                    right: 7,
                    minWidth: 14,
                    height: 14,
                    background: 'var(--gj-red)',
                    color: 'var(--gj-surface)',
                    borderRadius: 999,
                    border: '2px solid var(--gj-surface)',
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '0 3px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </button>
          ) : (
            <Link
              href="/jeune/notifications"
              aria-label={hasUnread ? `Notifications (${unread} non lues)` : 'Notifications'}
              className="relative inline-flex items-center justify-center no-underline"
              style={{
                minWidth: 'var(--tap-min)',
                minHeight: 'var(--tap-min)',
                color: 'var(--gj-ink)',
              }}
            >
              <Icon name="bell" size={20} />
              {hasUnread ? (
                <span
                  aria-hidden
                  className="absolute"
                  style={{
                    top: 7,
                    right: 7,
                    minWidth: 14,
                    height: 14,
                    background: 'var(--gj-red)',
                    color: 'var(--gj-surface)',
                    borderRadius: 999,
                    border: '2px solid var(--gj-surface)',
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '0 3px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </Link>
          )}

          {/* User : UserMenu (session) ou avatar léger */}
          {session ? (
            <UserMenu
              initials={initials}
              prenom={session.prenom ?? ''}
              nom={session.nom ?? ''}
              cjsUid={session.cjsUid}
              hasPhoto={hasPhoto}
            />
          ) : initials ? (
            <button
              type="button"
              onClick={onUserClick}
              aria-label="Profil"
              className="inline-flex items-center justify-center cursor-pointer"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))',
                color: 'var(--gj-surface)',
                fontWeight: 800,
                fontSize: 11,
                border: 0,
              }}
            >
              {initials}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
