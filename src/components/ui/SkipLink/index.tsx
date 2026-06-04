/**
 * SkipLink — lien d'évitement clavier ("Aller au contenu principal").
 *
 * Invisible jusqu'au focus (sr-only → focus:not-sr-only). Premier élément
 * focusable de chaque layout pour permettre aux utilisateurs clavier et
 * lecteurs d'écran de sauter directement à `<main id="main">`.
 *
 * A11y : WCAG 2.4.1 "Bypass Blocks".
 */
export interface SkipLinkProps {
  /** Cible du lien (par défaut `#main`). */
  href?: string
  /** Libellé visible au focus. */
  children?: React.ReactNode
}

export function SkipLink({ href = '#main', children = 'Aller au contenu principal' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-space-2 focus:left-space-2
        focus:z-[900] focus:bg-gj-teal focus:text-white focus:px-space-3 focus:py-space-2
        focus:rounded-gj-md focus:text-fs-300 focus:font-bold focus:no-underline"
    >
      {children}
    </a>
  )
}
