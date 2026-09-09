'use client'

import { FullPageState } from '@/components/ui'

/**
 * Frontière d'erreur de l'espace conseiller (`/conseiller/*`) — GUIC-689 (Lot D2).
 *
 * Le message d'erreur brut n'est jamais affiché à l'utilisateur (il peut
 * contenir des détails techniques). Aucun logger client-safe n'existe dans
 * le projet à ce jour (`src/lib/logger.ts` est réservé au serveur) : on ne
 * journalise donc rien ici plutôt que d'improviser un `console.error` non
 * prévu par la spec.
 */
export default function ConseillerError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gj-bg px-space-4 py-space-6">
      <FullPageState
        icon="alert"
        tone="red"
        title="Oups, une erreur est survenue"
        body="Ce n'est pas de votre faute — réessayez dans un instant. Si le problème persiste, contactez le support."
        primaryAction={{ label: 'Réessayer', icon: 'refresh', onClick: reset }}
        secondaryAction={{ label: "Retour à l'accueil", href: '/conseiller' }}
      />
    </div>
  )
}
