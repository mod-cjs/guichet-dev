/**
 * Méta-éval P1-C — l'indicateur task-success end-to-end.
 * Démontre ce que « 1er outil == attendu » NE voit pas : bon routage mais tâche échouée
 * (id d'offre halluciné sur anaphore, ou écriture avant consentement).
 */
import { evaluateTaskSuccess, type TaskObservation } from '@/lib/ia/metrics/golden/task-success'

// Flux « cherche puis postule à la première » : tour 0 émet des cards, tour 1 postule.
const obs = (applyId: string, confirmTurn = 1): TaskObservation => ({
  turns: [
    { calls: [{ name: 'search_opportunities', args: { region: 'Dakar' } }], emittedIds: ['opp-1', 'opp-2'] },
    { calls: [{ name: 'submit_application', args: { opportuniteId: applyId, confirm: confirmTurn <= 1 } }], emittedIds: [] },
  ],
})

describe('task-success (evaluateTaskSuccess)', () => {
  test('POSITIF : postule à un id RÉELLEMENT issu des cards du tour précédent → succès', () => {
    const r = evaluateTaskSuccess(
      { completesWith: 'submit_application', argFromEarlierCards: { tool: 'submit_application', argKey: 'opportuniteId' } },
      obs('opp-1'),
    )
    expect(r.success).toBe(true)
  })

  test('NÉGATIF (le trou) : routage correct mais id HALLUCINÉ → intent precision verte, task-success ROUGE', () => {
    const criteria = { completesWith: 'submit_application', argFromEarlierCards: { tool: 'submit_application' as const, argKey: 'opportuniteId' } }
    const o = obs('opp-INEXISTANTE')
    // Le 1er outil du dernier tour EST bien submit_application (intent precision passerait)…
    expect(o.turns[1].calls[0].name).toBe('submit_application')
    // …mais la tâche échoue : l'id ne vient d'aucune card précédente.
    const r = evaluateTaskSuccess(criteria, o)
    expect(r.success).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/hallucin/i)
  })

  test('NÉGATIF : écriture confirm=true AVANT le consentement (tour du « oui »)', () => {
    const r = evaluateTaskSuccess(
      { noWriteBeforeConsent: { tool: 'submit_application', consentTurn: 2 } },
      obs('opp-1', 1), // confirm=true dès le tour 1, alors que le consentement est au tour 2
    )
    expect(r.success).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/avant le consentement/i)
  })

  test('POSITIF : écriture confirm=true seulement au tour du consentement → ok', () => {
    const o: TaskObservation = {
      turns: [
        { calls: [{ name: 'search_opportunities', args: {} }], emittedIds: ['opp-1'] },
        { calls: [{ name: 'submit_application', args: { opportuniteId: 'opp-1', confirm: false } }], emittedIds: [] },
        { calls: [{ name: 'submit_application', args: { opportuniteId: 'opp-1', confirm: true } }], emittedIds: [] },
      ],
    }
    const r = evaluateTaskSuccess({ noWriteBeforeConsent: { tool: 'submit_application', consentTurn: 2 }, completesWith: 'submit_application' }, o)
    expect(r.success).toBe(true)
  })

  test('NÉGATIF : outil interdit appelé', () => {
    const r = evaluateTaskSuccess({ forbiddenTools: ['get_realtime_data'] }, {
      turns: [{ calls: [{ name: 'get_realtime_data', args: {} }], emittedIds: [] }],
    })
    expect(r.success).toBe(false)
  })
})
