'use client'
import { useState, type FormEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

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
 * - Boutons droite : favoris (bookmark + count), cloche (unread badge),
 *   aide (info), avatar utilisateur
 * - Sticky top, h-16, bg-white, border-bottom
 *
 * Visible ≥1024px — l'AppTopbar mobile prend le relais en-dessous.
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
  // Props conservées pour rétrocompatibilité — silencer les unused.
  void unread
  void bookmarkCount
  void userInitials
  void userPrenom
  void userNom
  void cjsUid
  void onBookmarkClick
  void onBellClick
  void onInfoClick
  void onUserClick
  void yayeOpenProp
  void onYayeOpenChange

  const router = useRouter()
  const pathname = usePathname()
  const isControlled = typeof searchQuery === 'string'
  const [internalQuery, setInternalQuery] = useState('')
  const value = isControlled ? searchQuery : internalQuery
  const handleChange = (v: string) => {
    if (!isControlled) setInternalQuery(v)
    onSearchChange?.(v)
  }
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (value ?? '').trim()
    if (onSearchSubmit) {
      onSearchSubmit(q)
      return
    }
    if (q.length === 0) return
    router.push(`/opportunites?q=${encodeURIComponent(q)}`)
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
        minHeight: 64,
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

      <span style={{ flex: 1 }} />
    </header>
  )
}
