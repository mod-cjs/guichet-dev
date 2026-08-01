/**
 * Onglets de la fiche Centre (GUIC-687). Logique pure (testable).
 * Ordre maquette : vue · equipe · ressources · frequentation · (bibliotheque · evenements à venir).
 */
import type { IconName } from '@/components/ui/Icon'

export type CentreTab = 'vue' | 'equipe' | 'ressources' | 'frequentation' | 'biblio' | 'evenements'

export const CENTRE_TABS: { value: CentreTab; label: string; icon: IconName }[] = [
  { value: 'vue', label: "Vue d'ensemble", icon: 'home' },
  { value: 'equipe', label: 'Équipe & accès', icon: 'users' },
  { value: 'ressources', label: 'Ressources & réservations', icon: 'resources' },
  { value: 'frequentation', label: 'Fréquentation', icon: 'chart' },
  { value: 'biblio', label: 'Bibliothèque', icon: 'bookmark' },
  { value: 'evenements', label: 'Événements & insertions', icon: 'calendar' },
]

const VALUES = CENTRE_TABS.map((t) => t.value)

/** Onglet actif normalisé (défaut : vue d'ensemble). */
export function parseTab(value: string | null | undefined): CentreTab {
  return (VALUES as string[]).includes(value ?? '') ? (value as CentreTab) : 'vue'
}
