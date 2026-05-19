'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

const EXCLUDED_PREFIXES = ['/admin', '/recruteur']

function isExcluded(path: string): boolean {
  return EXCLUDED_PREFIXES.some(p => path.startsWith(p))
}

/**
 * Wrapper client qui :
 * - Cache le shell sur routes admin/recruteur (qui ont leur propre sidebar)
 * - Applique la classe `body.has-mobile-shell` pour activer le padding-bottom
 *   global défini dans globals.css (cf .has-mobile-shell selector)
 */
export function MobileShellPadding({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const active = !isExcluded(pathname)

  useEffect(() => {
    if (active) {
      document.body.classList.add('has-mobile-shell')
      return () => { document.body.classList.remove('has-mobile-shell') }
    }
  }, [active])

  if (!active) return null
  return <>{children}</>
}
