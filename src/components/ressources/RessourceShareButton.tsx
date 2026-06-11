'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Icon } from '@/components/ui'

interface RessourceShareButtonProps {
  /** Titre partagé. */
  title: string
  /** Texte court partagé (description tronquée). */
  text?: string
  /** URL absolue à partager (ou relative — sera résolue contre window.location). */
  url: string
  /** Variante de bouton sous-jacent. Défaut "ghost". */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Label personnalisé. Défaut « Partager ». */
  label?: string
  /** ID racine pour le data-testid (debug/tests). */
  testId?: string
}

type ShareStatus = 'idle' | 'shared' | 'copied' | 'error'

/**
 * Bouton de partage social — GUIC-363.
 *
 * Stratégie :
 *  1. Si `navigator.share` est disponible (mobile / Safari / PWA) → Web Share API.
 *  2. Sinon, fallback `navigator.clipboard.writeText` + feedback inline.
 *  3. Si même le clipboard échoue, on affiche un message d'erreur transitoire.
 *
 * Pas d'emoji ; pas de hex en dur ; tap-target ≥ 44px (hérité du Button UI).
 */
export function RessourceShareButton({
  title,
  text,
  url,
  variant = 'ghost',
  label = 'Partager',
  testId = 'ressource-share-btn',
}: RessourceShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>('idle')

  // Reset auto du feedback après 2.5s
  useEffect(() => {
    if (status === 'idle') return
    const t = setTimeout(() => setStatus('idle'), 2500)
    return () => clearTimeout(t)
  }, [status])

  const handleShare = useCallback(async () => {
    // Résolution URL absolue côté client.
    const absoluteUrl =
      typeof window !== 'undefined' && url.startsWith('/')
        ? `${window.location.origin}${url}`
        : url

    // 1. Web Share API
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url: absoluteUrl })
        setStatus('shared')
        return
      } catch (err) {
        // L'utilisateur a annulé → on ne montre pas d'erreur.
        if (err instanceof Error && err.name === 'AbortError') {
          setStatus('idle')
          return
        }
        // Sinon on tombe sur le fallback clipboard.
      }
    }

    // 2. Fallback clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absoluteUrl)
        setStatus('copied')
        return
      }
      throw new Error('clipboard-unavailable')
    } catch {
      setStatus('error')
    }
  }, [title, text, url])

  const feedback =
    status === 'shared'
      ? 'Partagé'
      : status === 'copied'
        ? 'Lien copié'
        : status === 'error'
          ? 'Partage impossible'
          : null

  return (
    <span className="inline-flex items-center gap-space-2">
      <Button
        type="button"
        variant={variant}
        onClick={handleShare}
        aria-label={label}
        data-testid={testId}
      >
        <Icon name="external" size={16} aria-hidden />
        <span className="ml-1">{label}</span>
      </Button>
      {feedback && (
        <span
          role="status"
          aria-live="polite"
          data-testid={`${testId}-feedback`}
          className={`text-fs-200 font-bold ${
            status === 'error' ? 'text-gj-red-ink' : 'text-gj-teal-deep'
          }`}
        >
          {feedback}
        </span>
      )}
    </span>
  )
}
