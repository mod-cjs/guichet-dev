'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Routes où le shell mobile NE doit PAS apparaître :
// - /admin /recruteur : ont leur propre sidebar
// - /jeune/onboarding : funnel obligatoire, ne pas permettre de sortir
// - /auth : pages de connexion / callback
const EXCLUDED_PREFIXES = ['/admin', '/recruteur', '/jeune/onboarding', '/auth']

function isExcluded(path: string): boolean {
  return EXCLUDED_PREFIXES.some(p => path === p || path.startsWith(p + '/'))
}

/**
 * Filtre client pour conditionner le rendu du shell selon le pathname.
 * Ne touche pas au body — le padding est géré en CSS-only via `:has(.gj-bottom-nav)`
 * dans globals.css pour éviter tout flash au premier paint.
 */
export function MobileShellGate({ children }: { children: ReactNode }) {
  // usePathname() peut retourner null hors contexte Next router — fallback
  // sur '/' qui n'est jamais dans EXCLUDED_PREFIXES (donc on rend le shell).
  const pathname = usePathname() ?? '/'
  if (isExcluded(pathname)) return null
  return <>{children}</>
}
