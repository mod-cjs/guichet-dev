// Task-success end-to-end (indicateur P1-C, spec yaye-ats-tests-v4).
//
// `intentPrecision` (1er outil == attendu) ne mesure PAS si la TÂCHE a réussi : un flux
// multi-tour peut router juste à chaque étape et échouer (id d'offre halluciné en anaphore,
// écriture avant consentement). Ce module évalue l'ÉTAT FINAL réel à partir des appels
// d'outils observés. Fonction PURE et déterministe → testable en CI (méta-éval).

/** Appel d'outil observé à un tour donné. */
export interface ObservedCall {
  name: string
  args: Record<string, unknown>
}

/** Ce qu'un tour a produit : ses appels d'outils et les ids de cards d'opportunités émises. */
export interface TaskTurn {
  calls: ObservedCall[]
  /** ids des offres réellement remontées par les outils à CE tour (pour l'ancrage d'anaphore). */
  emittedIds: string[]
}

/** Trace complète d'un scénario (un TaskTurn par tour utilisateur, dans l'ordre). */
export interface TaskObservation {
  turns: TaskTurn[]
}

/** Critères de réussite déclaratifs (data, attachés au scénario). */
export interface SuccessCriteria {
  /** Un appel à cet outil doit avoir eu lieu (la tâche est « accomplie » par lui). */
  completesWith?: string
  /** L'argument `argKey` du DERNIER appel à `tool` doit provenir des cards d'un tour ANTÉRIEUR
   *  (anti-hallucination d'id sur une anaphore type « la première »). */
  argFromEarlierCards?: { tool: string; argKey: string }
  /** Aucun appel à `tool` avec `confirmArg`=true ne doit survenir AVANT le tour `consentTurn`. */
  noWriteBeforeConsent?: { tool: string; confirmArg?: string; consentTurn: number }
  /** Ces outils ne doivent jamais apparaître. */
  forbiddenTools?: string[]
}

export interface TaskSuccessResult {
  success: boolean
  reasons: string[]
}

function allCalls(obs: TaskObservation): { turn: number; call: ObservedCall }[] {
  return obs.turns.flatMap((t, turn) => t.calls.map((call) => ({ turn, call })))
}

/**
 * Évalue la réussite end-to-end d'une tâche à partir des appels d'outils observés.
 * `success` = tous les critères fournis sont satisfaits. `reasons` liste les échecs.
 */
export function evaluateTaskSuccess(criteria: SuccessCriteria, obs: TaskObservation): TaskSuccessResult {
  const reasons: string[] = []
  const calls = allCalls(obs)

  if (criteria.completesWith) {
    const done = calls.some((c) => c.call.name === criteria.completesWith)
    if (!done) reasons.push(`tâche non accomplie : aucun appel à ${criteria.completesWith}`)
  }

  if (criteria.forbiddenTools?.length) {
    const seen = criteria.forbiddenTools.filter((f) => calls.some((c) => c.call.name === f))
    if (seen.length) reasons.push(`outils interdits appelés : ${seen.join(', ')}`)
  }

  if (criteria.argFromEarlierCards) {
    const { tool, argKey } = criteria.argFromEarlierCards
    const invocations = calls.filter((c) => c.call.name === tool)
    if (invocations.length === 0) {
      reasons.push(`ancrage impossible : ${tool} jamais appelé`)
    } else {
      const last = invocations[invocations.length - 1]
      const value = last.call.args[argKey]
      // ids de cards émises STRICTEMENT avant le tour de l'appel final.
      const priorIds = new Set(obs.turns.slice(0, last.turn).flatMap((t) => t.emittedIds))
      if (value === undefined || value === null || value === '') {
        reasons.push(`argument ${argKey} absent de l'appel ${tool}`)
      } else if (!priorIds.has(String(value))) {
        reasons.push(`id halluciné : ${tool}.${argKey}=«${String(value)}» absent des cards des tours précédents`)
      }
    }
  }

  if (criteria.noWriteBeforeConsent) {
    const { tool, confirmArg = 'confirm', consentTurn } = criteria.noWriteBeforeConsent
    const premature = calls.find((c) => c.call.name === tool && c.call.args[confirmArg] === true && c.turn < consentTurn)
    if (premature) reasons.push(`écriture (${tool} ${confirmArg}=true) au tour ${premature.turn}, AVANT le consentement (tour ${consentTurn})`)
  }

  return { success: reasons.length === 0, reasons }
}
