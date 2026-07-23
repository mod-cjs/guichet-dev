import type { Metadata } from 'next'
import { AccessibiliteClient } from './AccessibiliteClient'

export const metadata: Metadata = { title: 'Inclusion & accessibilité' }

/**
 * GUIC-581 — Page dédiée Inclusion & accessibilité (design v4 Lot 4).
 * L'auth est gérée par le layout jeune ; les préférences viennent du
 * A11yProvider (valeur serveur > localStorage) monté dans ce même layout.
 */
export default function AccessibilitePage() {
  return <AccessibiliteClient />
}
