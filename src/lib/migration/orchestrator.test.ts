/**
 * @jest-environment node
 */
import {
  ALL_PHASES,
  phasesToRun,
  buildFinalReport,
  type PhaseName,
  type PhaseReport,
} from './orchestrator'

describe('orchestrator', () => {
  describe('phasesToRun', () => {
    it('retourne toutes les phases par défaut', () => {
      expect(phasesToRun({})).toEqual(ALL_PHASES)
    })

    it('saute les phases avant resumeFrom', () => {
      expect(phasesToRun({ resumeFrom: 'sync-utilisateurs' }))
        .toEqual(['sync-utilisateurs', 'migrate-drupal', 'backfill-phones'])
    })

    it('ne joue qu\'une seule phase si only fourni', () => {
      expect(phasesToRun({ only: 'create-sso' })).toEqual(['create-sso'])
    })

    it('lève si phase inconnue dans resumeFrom', () => {
      expect(() => phasesToRun({ resumeFrom: 'pas-une-phase' as PhaseName }))
        .toThrow(/phase inconnue/i)
    })
  })

  describe('buildFinalReport', () => {
    it('aggrège les compteurs de chaque phase', () => {
      const reports: PhaseReport[] = [
        { phase: 'create-sso',  status: 'ok',  durationMs: 1000, counters: { created: 100, errored: 0 } },
        { phase: 'sync-utilisateurs', status: 'ok',  durationMs: 2000, counters: { synced: 22000, errored: 0 } },
      ]
      const final = buildFinalReport(reports, 'batch-xyz')
      expect(final.import_batch).toBe('batch-xyz')
      expect(final.global.total_duration_ms).toBe(3000)
      expect(final.global.failed_phases).toBe(0)
      expect(final.phases).toHaveLength(2)
    })

    it('compte les phases en erreur', () => {
      const reports: PhaseReport[] = [
        { phase: 'create-sso', status: 'ok',     durationMs: 500, counters: {} },
        { phase: 'sync-utilisateurs', status: 'failed', durationMs: 100, counters: {}, error: 'boom' },
      ]
      const final = buildFinalReport(reports, 'b')
      expect(final.global.failed_phases).toBe(1)
      expect(final.global.has_errors).toBe(true)
    })
  })
})
