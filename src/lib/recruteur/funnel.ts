/**
 * GUIC-520 — Funnel de recrutement du dashboard recruteur (fonction pure).
 * 5 segments : Reçues → Présélection → Entretien → Retenues → Refusées.
 * Les issues (Retenue/Refusée) sont dérivées du statut ; les autres du pipeline.
 */
export type FunnelTone = 'recue' | 'presel' | 'entretien' | 'retenue' | 'refusee'

export interface FunnelSegment {
  id: FunnelTone
  label: string
  count: number
  /** Part (%) du total du funnel. */
  pct: number
}

export interface FunnelData {
  segments: FunnelSegment[]
  total: number
}

export interface FunnelCounts {
  recue: number
  preselection: number
  entretien: number
  retenue: number
  refusee: number
}

const ORDER: { id: FunnelTone; label: string; key: keyof FunnelCounts }[] = [
  { id: 'recue', label: 'Reçues', key: 'recue' },
  { id: 'presel', label: 'Présélection', key: 'preselection' },
  { id: 'entretien', label: 'Entretien', key: 'entretien' },
  { id: 'retenue', label: 'Retenues', key: 'retenue' },
  { id: 'refusee', label: 'Refusées', key: 'refusee' },
]

/** Construit les segments ordonnés du funnel + le total, avec pourcentages arrondis. */
export function buildFunnel(counts: FunnelCounts): FunnelData {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0)
  const total = ORDER.reduce((n, s) => n + safe(counts[s.key]), 0)
  const segments: FunnelSegment[] = ORDER.map((s) => {
    const count = safe(counts[s.key])
    return { id: s.id, label: s.label, count, pct: total ? Math.round((count / total) * 100) : 0 }
  })
  return { segments, total }
}
