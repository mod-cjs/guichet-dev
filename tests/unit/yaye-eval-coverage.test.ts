/**
 * Garde-couverture de l'éval (P1-D). Échoue si un outil déclaré perd tout scénario, ou si un
 * signal de danger n'est plus représenté. Empêche la régression silencieuse de couverture.
 */
import { EVAL_SCENARIOS } from '@/lib/ia/metrics/golden/eval-suite'

// Contrat : les 17 outils de l'agent (doit rester synchro avec TOOL_DEFINITIONS de tools.ts).
const ALL_TOOLS = [
  'search_opportunities', 'get_recommendations', 'query_knowledge_graph', 'get_realtime_data',
  'get_user_profile', 'get_badge', 'get_reservable_resources', 'reserve_resource',
  'submit_application', 'search_library', 'get_active_loans', 'search_events',
  'search_resources', 'find_centres', 'get_notifications', 'escalate_to_advisor', 'borrow_book',
]

/** Un outil est « couvert » s'il est attendu/autorisé/ciblé dans au moins un scénario. */
function coveredTools(): Set<string> {
  const s = new Set<string>()
  for (const sc of EVAL_SCENARIOS) {
    if (sc.expectedTool) s.add(sc.expectedTool)
    sc.allowedTools?.forEach((t) => s.add(t))
    if (sc.argsTool) s.add(sc.argsTool)
    if (sc.successCriteria?.completesWith) s.add(sc.successCriteria.completesWith)
  }
  return s
}

describe('couverture de l’éval', () => {
  test('les 17 outils déclarés ont chacun ≥ 1 scénario', () => {
    const covered = coveredTools()
    const orphelins = ALL_TOOLS.filter((t) => !covered.has(t))
    expect(orphelins).toEqual([])
  })

  test('les 7 situations de danger sont représentées (recall sécurité)', () => {
    const danger = EVAL_SCENARIOS.filter((s) => s.category === 'danger-escalation' && s.expectEscalation)
    // suicide, violence, harcèlement, abus sexuel, exploitation, discrimination, détresse/humain
    expect(danger.length).toBeGreaterThanOrEqual(7)
  })

  test('chaque catégorie HARD a au moins un scénario adversarial', () => {
    for (const cat of ['grounding', 'safety-cdp', 'danger-escalation', 'injection'] as const) {
      const adv = EVAL_SCENARIOS.filter((s) => s.category === cat && s.difficulty === 'adversarial')
      expect(adv.length).toBeGreaterThan(0)
    }
  })

  test('tout scénario d’écriture multi-tour porte un critère anti-écriture-avant-consentement', () => {
    for (const id of ['m-reserve-flow', 'm-apply-confirm', 'm-borrow-confirm']) {
      const sc = EVAL_SCENARIOS.find((s) => s.id === id)
      expect(sc?.successCriteria?.noWriteBeforeConsent).toBeDefined()
    }
  })
})
