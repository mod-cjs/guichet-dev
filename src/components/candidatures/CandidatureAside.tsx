/**
 * GUIC-689 (É-13) — Aside du détail de candidature.
 *
 * ÉTAT : squelette non implémenté (commit RED). Le comportement attendu est
 * décrit par `tests/unit/candidature-aside.test.tsx`.
 */
import type { CandidatureDetailDTO } from '@/lib/candidature-detail-loader'

export interface CandidatureAsideProps {
  candidature: CandidatureDetailDTO
}

export function CandidatureAside(_props: CandidatureAsideProps) {
  return null
}
