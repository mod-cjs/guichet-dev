// Faux client LLM scriptable — socle partagé des tests Yaye/ATS (Lot 1, spec yaye-ats-tests-v4).
//
// UN SEUL script décrit la séquence de réponses du modèle. Le même script sert `runAgent`
// (non-stream) ET `streamAgent` (stream:true) : le fake produit une complétion OpenAI ou un
// flux de chunks `delta` selon `params.stream`. Il ENREGISTRE chaque requête reçue → on peut
// asserter le prompt système envoyé, les tools, `tool_choice`, le sampling, l'historique.
//
// Remplace les helpers copiés-collés dans chaque test (`final()`, `withToolCall()`, `streamOf()`,
// `textDelta()`, `toolDelta()`) : une seule source de vérité pour la forme des réponses LLM.

/** Un tour de réponse du modèle. */
export type ScriptTurn =
  | { kind: 'text'; text: string }
  | { kind: 'tools'; text: string | null; calls: { name: string; args: Record<string, unknown> | string }[] }
  | { kind: 'throw'; message: string }

/** Réponse finale en langage naturel (aucun outil). */
export const say = (text: string): ScriptTurn => ({ kind: 'text', text })
/** Le modèle demande UN appel d'outil (round de décision). */
export const callTool = (name: string, args: Record<string, unknown> | string = {}): ScriptTurn => ({
  kind: 'tools',
  text: null,
  calls: [{ name, args }],
})
/** Le modèle demande PLUSIEURS appels d'outils en parallèle (même round). */
export const callTools = (...calls: { name: string; args?: Record<string, unknown> | string }[]): ScriptTurn => ({
  kind: 'tools',
  text: null,
  calls: calls.map((c) => ({ name: c.name, args: c.args ?? {} })),
})
/** Le modèle lève une erreur (panne réseau/décodage) → teste le fail-soft. */
export const boom = (message = 'LLM indisponible'): ScriptTurn => ({ kind: 'throw', message })

const argsToString = (a: Record<string, unknown> | string): string => (typeof a === 'string' ? a : JSON.stringify(a ?? {}))

function turnToCompletion(turn: ScriptTurn, i: number): unknown {
  if (turn.kind === 'tools') {
    return {
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: turn.text,
            tool_calls: turn.calls.map((c, k) => ({
              id: `call_${i}_${k}`,
              type: 'function',
              function: { name: c.name, arguments: argsToString(c.args) },
            })),
          },
        },
      ],
    }
  }
  return { choices: [{ finish_reason: 'stop', message: { content: turn.kind === 'text' ? turn.text : '', tool_calls: undefined } }] }
}

async function* streamTurn(turn: ScriptTurn, i: number): AsyncGenerator<unknown> {
  if (turn.kind === 'tools') {
    for (let k = 0; k < turn.calls.length; k++) {
      const c = turn.calls[k]
      const args = argsToString(c.args)
      const mid = Math.ceil(args.length / 2)
      // Args FRAGMENTÉS sur 2 deltas (comme Vertex/OpenAI en vrai) → exerce l'accumulation
      // cross-chunk de l'agent. 1er delta : id + name + 1ère moitié ; 2e delta : la suite.
      yield { choices: [{ delta: { tool_calls: [{ index: k, id: `call_${i}_${k}`, type: 'function', function: { name: c.name, arguments: args.slice(0, mid) } }] } }] }
      if (args.slice(mid)) yield { choices: [{ delta: { tool_calls: [{ index: k, function: { arguments: args.slice(mid) } }] } }] }
    }
    return
  }
  const text = turn.kind === 'text' ? turn.text : ''
  // Découpe en fragments (mot + espace) → vérifie le vrai streaming token-par-token.
  for (const part of text.match(/\S+\s*/g) ?? ['']) yield { choices: [{ delta: { content: part } }] }
}

/** Client LLM factice à la forme `{ chat: { completions: { create } } }` (OpenAI-compat). */
export class FakeLlm {
  private turns: ScriptTurn[]
  private cursor = 0
  /** Toutes les requêtes reçues, dans l'ordre (pour les assertions). */
  readonly requests: any[] = []

  constructor(turns: ScriptTurn[] = []) {
    this.turns = turns
  }

  /** (Re)charge le script de réponses. */
  load(turns: ScriptTurn[]): this {
    this.turns = turns
    this.cursor = 0
    this.requests.length = 0
    return this
  }

  /** Remet le curseur et l'historique à zéro (entre deux tests). */
  reset(): this {
    this.cursor = 0
    this.requests.length = 0
    return this
  }

  get client() {
    const self = this
    const create = (params: any): any => {
      self.requests.push(params)
      const turn = self.turns[self.cursor] ?? ({ kind: 'text', text: '' } as ScriptTurn)
      const i = self.cursor
      self.cursor += 1
      if (turn.kind === 'throw') {
        if (params?.stream) {
          return (async function* () {
            throw new Error(turn.message)
          })()
        }
        return Promise.reject(new Error(turn.message))
      }
      return params?.stream ? streamTurn(turn, i) : Promise.resolve(turnToCompletion(turn, i))
    }
    return { chat: { completions: { create } } }
  }

  // ── Assertions ──────────────────────────────────────────────────────────────
  /** Nombre d'appels au modèle. */
  get callCount(): number {
    return this.requests.length
  }
  /** Dernière requête envoyée au modèle. */
  get lastRequest(): any {
    return this.requests[this.requests.length - 1]
  }
  /** Messages `system` de la requête `reqIndex` (défaut : la première). */
  systemMessages(reqIndex = 0): string[] {
    const msgs = (this.requests[reqIndex]?.messages ?? []) as { role: string; content: unknown }[]
    return msgs.filter((m) => m.role === 'system').map((m) => String(m.content))
  }
  /** Concaténation des messages `system` (pratique pour `toContain`). */
  systemText(reqIndex = 0): string {
    return this.systemMessages(reqIndex).join('\n')
  }
}
