import type { CritereScore } from '@/lib/profil-score'

export interface CompletionChecklistProps {
  etat: { score: number; criteres: CritereScore[] }
}

/** GUIC-689 — contrat posé, rendu non implémenté (voir le test associé). */
export function CompletionChecklist(_props: CompletionChecklistProps) {
  return null
}
