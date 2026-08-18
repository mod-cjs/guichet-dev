'use client'

import { useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

/**
 * GUIC-522 F-13 — frontière d'erreur de /admin/bibliotheque (page `force-dynamic`, sans
 * `error.tsx` un échec de requête DB remontait un 500 brut, non cadré). Message métier +
 * bouton Réessayer (`reset` relance le rendu du segment).
 */
export default function BibliothequeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin/bibliotheque] erreur de rendu', error)
  }, [error])

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '72px auto',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'var(--gj-red-soft)',
          color: 'var(--gj-red)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="alert" size={24} />
      </div>
      <h1 style={{ fontSize: 17, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>
        Impossible d&apos;afficher la bibliothèque
      </h1>
      <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>
        Une erreur est survenue lors du chargement des données. Réessayez ; si le problème
        persiste, contactez le support technique.
      </p>
      <Button variant="primary" onClick={() => reset()}>
        Réessayer
      </Button>
    </div>
  )
}
