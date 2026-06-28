// Alimentation de la garde anti-régression Yaye (GUIC-435 — jalon E).
// La fonction PURE `detectRegression` (regression.ts) n'avait NI baseline persistée
// NI appelant. Ici on construit l'instantané courant (depuis le YQS global) et on
// le compare à une baseline stockée en Redis. Le cron `yaye-eval` initialise la
// baseline au 1er run puis compare chaque nuit ; le dashboard lit en SEUL lecture.

import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { computeYqsGlobal } from './yqs'
import { detectRegression, type YqsSnapshot, type RegressionResult } from './regression'
import type { RollupFilters } from './rollups'

const BASELINE_KEY = 'yaye:metrics:baseline'
/** Précision d'intention du dernier golden run offline (écrite par le script golden). */
const GOLDEN_KEY = 'yaye:metrics:golden:last'

export interface StoredBaseline extends YqsSnapshot {
  /** Date ISO de figeage de la baseline. */
  calculeLe: string
}

export async function loadBaseline(): Promise<StoredBaseline | null> {
  try {
    const raw = await redis.get(BASELINE_KEY)
    return raw ? (JSON.parse(raw) as StoredBaseline) : null
  } catch (err) {
    logger.warn('[yaye-regression] load baseline échec', { err: String(err) })
    return null
  }
}

export async function saveBaseline(snap: YqsSnapshot): Promise<StoredBaseline> {
  const stored: StoredBaseline = { ...snap, calculeLe: new Date().toISOString() }
  try {
    await redis.set(BASELINE_KEY, JSON.stringify(stored))
  } catch (err) {
    logger.warn('[yaye-regression] save baseline échec', { err: String(err) })
  }
  return stored
}

/** Précision d'intention du dernier golden run (null si jamais exécuté). Fail-soft. */
async function loadGoldenPrecision(): Promise<number | null> {
  try {
    const raw = await redis.get(GOLDEN_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { precision?: unknown }
    return typeof v.precision === 'number' ? v.precision : null
  } catch {
    return null
  }
}

/** Instantané courant de la fenêtre : YQS + dimensions critiques + précision golden. */
export async function buildCurrentSnapshot(filters: RollupFilters = {}): Promise<YqsSnapshot> {
  const [g, intentPrecision] = await Promise.all([computeYqsGlobal(filters), loadGoldenPrecision()])
  return {
    yqs: g.yqs,
    fidelite: g.qualite.fidelite,
    conformiteCdp: g.qualite.conformiteCdp,
    intentPrecision,
  }
}

export interface RegressionReport {
  /** null si la baseline vient d'être initialisée (rien à comparer). */
  result: RegressionResult | null
  current: YqsSnapshot
  baseline: StoredBaseline | null
  baselineInitialisee: boolean
}

/**
 * Garde anti-régression (écrit la baseline si absente). À appeler depuis le cron.
 * 1er run (ou `promote`) → fige l'instantané courant comme baseline et ne compare pas.
 */
export async function runRegressionGuard(
  filters: RollupFilters = {},
  promote = false,
): Promise<RegressionReport> {
  const current = await buildCurrentSnapshot(filters)
  const baseline = await loadBaseline()
  if (!baseline || promote) {
    const stored = await saveBaseline(current)
    return { result: null, current, baseline: stored, baselineInitialisee: true }
  }
  return { result: detectRegression(current, baseline), current, baseline, baselineInitialisee: false }
}

/** Variante LECTURE SEULE pour le dashboard (ne modifie jamais la baseline). */
export async function peekRegression(filters: RollupFilters = {}): Promise<RegressionReport> {
  const [current, baseline] = await Promise.all([buildCurrentSnapshot(filters), loadBaseline()])
  return {
    result: baseline ? detectRegression(current, baseline) : null,
    current,
    baseline,
    baselineInitialisee: false,
  }
}
