'use client'

import { FullPageState } from '@/components/ui'

/**
 * Frontière d'erreur de l'espace jeune (`/jeune/*`) — GUIC-689 (Lot D2).
 *
 * Le layout parent (topbar/sidebar) continue de se rendre : seul le contenu
 * de la page en erreur est remplacé par cet état plein écran.
 *
 * Le message d'erreur brut n'est jamais affiché à l'utilisateur (il peut
 * contenir des détails techniques). Aucun logger client-safe n'existe dans
 * le projet à ce jour (`src/lib/logger.ts` est réservé au serveur — il
 * utilise `process.stdout`/`crypto` node) : on ne journalise donc rien ici
 * plutôt que d'improviser un `console.error` non prévu par la spec.
 */
export default function JeuneError({
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
        body="Ce n'est pas de ta faute — réessaie dans un instant. Si le problème persiste, contacte le support."
        primaryAction={{ label: 'Réessayer', icon: 'refresh', onClick: reset }}
        secondaryAction={{ label: 'Retour au tableau de bord', href: '/jeune/tableau-de-bord' }}
      />
    </div>
  )
}
