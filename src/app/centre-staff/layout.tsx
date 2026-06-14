/**
 * GUIC-387 — Layout racine `/centre-staff/*`.
 *
 * Sert de wrapper visuel commun (pas de BottomNav). L'authentification est
 * appliquée par le layout enfant `(protected)/layout.tsx`.
 */

import type { ReactNode } from 'react'

export default function CentreStaffRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-color-surface-base">{children}</div>
}
