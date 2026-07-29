/**
 * Onglets de la fiche Centre (GUIC-687 · Phase A). Logique pure (testable).
 * Phase B ajoutera : equipe, bibliotheque, evenements.
 */
import type { IconName } from '@/components/ui/Icon'

export type CentreTab = 'vue' | 'ressources' | 'frequentation'

export const CENTRE_TABS: { value: CentreTab; label: string; icon: IconName }[] = [
  { value: 'vue', label: "Vue d'ensemble", icon: 'home' },
  { value: 'ressources', label: 'Ressources & réservations', icon: 'resources' },
  { value: 'frequentation', label: 'Fréquentation', icon: 'chart' },
]

const VALUES = CENTRE_TABS.map((t) => t.value)

/** Onglet actif normalisé (défaut : vue d'ensemble). */
export function parseTab(value: string | null | undefined): CentreTab {
  return (VALUES as string[]).includes(value ?? '') ? (value as CentreTab) : 'vue'
}
