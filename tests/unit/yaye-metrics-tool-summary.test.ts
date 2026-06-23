/**
 * @jest-environment node
 *
 * Tests du résumé des résultats d'outils (GUIC-435, R1).
 * Vérifie : extraction non-PII bornée pour le juge.
 */

import { summarizeToolResult } from '@/lib/ia/metrics/tool-summary'

test('opportunites : compte + titres', () => {
  const r = summarizeToolResult('search_opportunities', {
    ok: true,
    block: {
      kind: 'opportunites',
      items: [
        { id: '1', slug: 'a', titre: 'Stage Dev', type: 'Stage', organisation: null, region: null, deadline: null },
        { id: '2', slug: 'b', titre: 'Bourse X', type: 'Bourse', organisation: null, region: null, deadline: null },
      ],
    },
  })
  expect(r).toContain('2 résultat(s)')
  expect(r).toContain('Stage Dev')
})

test('aucun résultat → "0 résultat(s)" (permet de détecter une hallucination)', () => {
  const r = summarizeToolResult('search_opportunities', { ok: true, block: { kind: 'opportunites', items: [] } })
  expect(r).toBe('0 résultat(s)')
})

test('données PII (profil/temps réel) : on n’expose QUE les noms de champs, pas les valeurs', () => {
  const r = summarizeToolResult('get_realtime_data', { ok: true, data: { candidatures: 4, favoris: 7 } })
  expect(r).toContain('candidatures')
  expect(r).not.toContain('4') // valeurs non exposées (CDP)
})

test('échec outil', () => {
  const r = summarizeToolResult('reserve_resource', { ok: false, error: 'conflit créneau' })
  expect(r).toContain('échec')
})
