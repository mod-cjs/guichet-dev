import type { ReactNode } from 'react'

export interface PageHeaderProps {
  /** Titre de page (rendu en <h1>). */
  title: string
  /** Sous-titre optionnel (paragraphe d'introduction). */
  subtitle?: ReactNode
  /** Slot droit pour CTAs (boutons, liens). */
  actions?: ReactNode
  /** Classes additionnelles appliquées au container. */
  className?: string
}

/**
 * <PageHeader /> — En-tête uniforme des pages jeune (GUIC-403).
 *
 * Standardise titre + subtitle + slot actions sur :
 *   - /jeune/mes-favoris
 *   - /jeune/mes-candidatures
 *   - /jeune/mes-reservations-centres
 *   - /jeune/mon-profil
 *   - /jeune/ma-carte
 *
 * Pattern visuel aligné sur l'existant (text-fs-800 font-black) pour ne pas
 * régresser les pages déjà refondues.
 */
export function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`mb-space-5 flex items-start justify-between gap-space-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="text-fs-800 font-black text-color-text-primary m-0">{title}</h1>
        {subtitle ? (
          <p className="text-fs-300 text-color-text-secondary mt-space-1">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex-shrink-0">{actions}</div> : null}
    </header>
  )
}
