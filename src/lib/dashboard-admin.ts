/**
 * Agrégats PURS du tableau de bord admin (GUIC-679) — testables sans DB.
 * Le loader serveur exécute les requêtes Prisma puis passe les comptes ici.
 */

export interface FunnelInput {
  key: string
  label: string
  count: number
}

export interface FunnelStep extends FunnelInput {
  /** Part du sommet du funnel (0..1). */
  pctOfTop: number
  /** Conversion depuis l'étape précédente (0..1), null pour la 1re. */
  conversion: number | null
  /** true = point de fuite (plus grosse perte de conversion). */
  dropoff: boolean
}

/**
 * Construit le parcours candidatures : % du sommet + conversion étape→étape,
 * et **surligne le point de fuite** (là où on perd le plus). Orienté action.
 */
export function buildFunnel(raw: FunnelInput[]): FunnelStep[] {
  const top = raw[0]?.count ?? 0
  const steps: FunnelStep[] = raw.map((s, i) => {
    const prev = i === 0 ? null : raw[i - 1].count
    const conversion = i === 0 ? null : prev && prev > 0 ? s.count / prev : 0
    return { ...s, pctOfTop: top > 0 ? s.count / top : 0, conversion, dropoff: false }
  })
  let worstLoss = -1
  let worstIdx = -1
  steps.forEach((s, i) => {
    if (i > 0 && s.conversion !== null) {
      const loss = 1 - s.conversion
      if (loss > worstLoss) {
        worstLoss = loss
        worstIdx = i
      }
    }
  })
  if (worstIdx >= 0) steps[worstIdx].dropoff = true
  return steps
}

/** Taux en % entier (0 si dénominateur nul). */
export function ratePct(num: number, denom: number): number {
  if (!denom) return 0
  return Math.round((num / denom) * 100)
}

/** Satisfaction = part de 👍 (note=+1) en %, null si aucun feedback. */
export function avgSatisfaction(feedback: { note: number }[]): number | null {
  if (feedback.length === 0) return null
  const pos = feedback.filter((f) => f.note === 1).length
  return Math.round((pos / feedback.length) * 100)
}
