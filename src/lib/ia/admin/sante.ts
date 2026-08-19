// GUIC-435 (Phase 4 — « Santé de Yaye ») — vue unifiée : agrège les signaux qui vivaient sur
// des écrans séparés (qualité/YQS + régression, escalades & SLA de la Phase 1, couverture
// d'éval + intentions en échec de la Phase 2, dérive de calibration) en UNE photo + des
// alertes opérationnelles. Chaque alerte est adossée à un signal réel — rien de fabriqué.

import { prisma } from '@/lib/prisma'
import { computeYqsGlobal } from '@/lib/ia/metrics/yqs'
import { peekRegression } from '@/lib/ia/metrics/regression-data'
import { computeCalibration } from '@/lib/ia/metrics/calibration-data'
import { computeEvalCoverage, type EvalCoverage } from '@/lib/ia/metrics/eval-coverage'
import { computeIntentionsEnEchec, type IntentionSante } from '@/lib/ia/metrics/intentions-echec'
import { computeConfigSante, type ConfigSante } from '@/lib/ia/admin/config-sante'
import { whereEnRetardSla } from '@/lib/ia/escalade-sla'

// ─── Alertes opérationnelles (fonction PURE) ──────────────────────────────────

export interface SanteSignaux {
  regressed: boolean
  escaladesSlaDepassees: number
  escaladesDangerOuvertes: number
  /** Dérive de calibration juge↔humain (0 = accord parfait, ↑ = désaccord). null si non mesurée. */
  calibrationDrift: number | null
}

export interface AlerteSante {
  niveau: 'critique' | 'warn'
  message: string
}

/** Seuil de dérive de calibration au-delà duquel on alerte (kappa perdu). */
const SEUIL_DRIFT = 0.3

/** Dérive les alertes opérationnelles depuis les signaux — critique d'abord, rien d'inventé. */
export function deriverAlertesSante(s: SanteSignaux): AlerteSante[] {
  const alertes: AlerteSante[] = []
  if (s.regressed) {
    alertes.push({ niveau: 'critique', message: 'La qualité de Yaye a baissé sous la référence.' })
  }
  if (s.escaladesSlaDepassees > 0) {
    const critique = s.escaladesDangerOuvertes > 0
    alertes.push({
      niveau: critique ? 'critique' : 'warn',
      message: `${s.escaladesSlaDepassees} escalade(s) au-delà du SLA${critique ? ` (dont ${s.escaladesDangerOuvertes} danger)` : ''}.`,
    })
  }
  if (s.calibrationDrift != null && s.calibrationDrift >= SEUIL_DRIFT) {
    alertes.push({ niveau: 'warn', message: 'Dérive de calibration juge↔humain élevée — la mesure de qualité est moins fiable.' })
  }
  return alertes.sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === 'critique' ? -1 : 1))
}

// ─── Agrégat (async, DB) ──────────────────────────────────────────────────────

export interface YayeSante {
  yqs: number | null
  regressed: boolean
  regressionDeltas: { yqs: number | null; fidelite: number | null; conformiteCdp: number | null; intentPrecision: number | null } | null
  escalades: { enAttente: number; slaDepassees: number; dangerOuvertes: number }
  coverage: EvalCoverage
  calibrationDrift: number | null
  /** Top 3 des intentions qui échouent (backlog d'amélioration prioritaire). */
  topEchecs: IntentionSante[]
  /** Health-check STATIQUE de la config LLM (allowlist / capacités / endpoint dédié). */
  config: ConfigSante
  alertes: AlerteSante[]
}

/** Dérive de calibration = 1 - (kappa de la pire dimension). null si aucune dimension mesurée. */
function driftDeCalibration(parDimension: Record<string, number> | undefined): number | null {
  if (!parDimension) return null
  const kappas = Object.values(parDimension)
  if (kappas.length === 0) return null
  return Math.max(0, Math.round((1 - Math.min(...kappas)) * 100) / 100)
}

export async function computeYayeSante(opts: { since?: Date } = {}): Promise<YayeSante> {
  const since = opts.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const dangerSla = { ...whereEnRetardSla(now), priorite: 1 }

  const [yqsG, regression, calibration, coverage, topEchecs, config, enAttente, slaDepassees, dangerOuvertes] = await Promise.all([
    computeYqsGlobal({ from: since }),
    peekRegression({ from: since }),
    computeCalibration(),
    computeEvalCoverage({ since }),
    computeIntentionsEnEchec({ since, minVolume: 5 }),
    computeConfigSante(),
    prisma.escaladeYaye.count({ where: { statut: { not: 'resolue' } } }),
    prisma.escaladeYaye.count({ where: whereEnRetardSla(now) }),
    prisma.escaladeYaye.count({ where: dangerSla }),
  ])

  const calibrationDrift = driftDeCalibration(calibration?.parDimension)
  const regressed = regression.result?.regressed ?? false

  // Les alertes runtime et les alertes de config statique remontent dans la même liste,
  // re-triées critique d'abord — un slot hors allowlist doit crier au même endroit qu'une régression.
  const alertes = [
    ...deriverAlertesSante({ regressed, escaladesSlaDepassees: slaDepassees, escaladesDangerOuvertes: dangerOuvertes, calibrationDrift }),
    ...config.alertes,
  ].sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === 'critique' ? -1 : 1))

  return {
    yqs: yqsG.yqs,
    regressed,
    regressionDeltas: regression.result?.deltas ?? null,
    escalades: { enAttente, slaDepassees, dangerOuvertes },
    coverage,
    calibrationDrift,
    topEchecs: topEchecs.slice(0, 3),
    config,
    alertes,
  }
}
