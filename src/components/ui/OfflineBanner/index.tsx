'use client'

import { useRouter } from 'next/navigation'
import { Icon } from '../Icon'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * OfflineBanner — GUIC-689 (Lot 13, `design-guichet-v5/system-states.jsx`
 * L41-47). Bandeau sticky sombre affiché uniquement hors-ligne : le public
 * cible est majoritairement mobile, sur réseau intermittent.
 *
 * Autonome : ne rend rien tant que `useOnlineStatus()` renvoie `true`. Le
 * lien « Réessayer » relance la navigation (`router.refresh()`) plutôt qu'un
 * rechargement complet de la page.
 *
 * À monter une fois, en tête d'un layout applicatif (au-dessus de la topbar).
 * Hors périmètre de cette story (voir rapport de livraison) : le point de
 * montage réel dans les layouts jeune/conseiller/recruteur.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const router = useRouter()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 flex items-center gap-space-2 bg-gj-ink text-white py-space-2 px-space-4 text-fs-300 font-bold"
      style={{ zIndex: 'var(--gj-z-nav)' }}
    >
      <Icon name="globe" size={17} className="text-gj-yellow flex-shrink-0" />
      <span className="flex-1">Tu es hors-ligne — les données affichées peuvent dater.</span>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="text-gj-yellow font-extrabold text-fs-200 whitespace-nowrap min-h-[var(--tap-min)] px-1"
      >
        Réessayer
      </button>
    </div>
  )
}
