import type { ExperienceItem, DiplomeItem, EngagementItem } from '@/types/profil'

export interface ElementParcours {
  id: string
  type: 'formation' | 'experience' | 'engagement'
  titre: string
  organisation: string
  debut: string
  periode: string
  enCours: boolean
}

/** GUIC-689 — contrat posé, comportement non implémenté (voir le test associé). */
export function construireParcours(
  _experiences: ExperienceItem[],
  _diplomes: DiplomeItem[],
  _engagements: EngagementItem[],
): ElementParcours[] {
  return []
}
