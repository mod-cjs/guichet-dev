/**
 * Logique pure de l'orchestrateur de migration (GUIC-17).
 * Le script scripts/migrate-all.ts se contente d'exécuter les phases.
 */

export const ALL_PHASES = [
  'extract-map',
  'create-sso',
  'sync-utilisateurs',
  'migrate-drupal',
  'backfill-phones',
] as const

export type PhaseName = typeof ALL_PHASES[number]

export interface PhaseReport {
  phase:      PhaseName
  status:     'ok' | 'failed' | 'skipped'
  durationMs: number
  counters:   Record<string, number>
  error?:     string
}

export interface FinalReport {
  import_batch: string
  timestamp:    string
  global: {
    total_duration_ms: number
    failed_phases:     number
    has_errors:        boolean
  }
  phases: PhaseReport[]
}

export interface RunOptions {
  resumeFrom?: PhaseName | string
  only?:      PhaseName | string
}

export function phasesToRun(opts: RunOptions): PhaseName[] {
  if (opts.only) {
    if (!ALL_PHASES.includes(opts.only as PhaseName)) {
      throw new Error(`phase inconnue : ${opts.only}`)
    }
    return [opts.only as PhaseName]
  }
  if (opts.resumeFrom) {
    const idx = ALL_PHASES.indexOf(opts.resumeFrom as PhaseName)
    if (idx < 0) throw new Error(`phase inconnue : ${opts.resumeFrom}`)
    return ALL_PHASES.slice(idx)
  }
  return [...ALL_PHASES]
}

export function buildFinalReport(reports: PhaseReport[], importBatch: string): FinalReport {
  const totalMs       = reports.reduce((s, r) => s + r.durationMs, 0)
  const failedPhases  = reports.filter(r => r.status === 'failed').length
  return {
    import_batch: importBatch,
    timestamp:    new Date().toISOString(),
    global: {
      total_duration_ms: totalMs,
      failed_phases:     failedPhases,
      has_errors:        failedPhases > 0,
    },
    phases: reports,
  }
}
