/**
 * GUIC-617 — Mock de `fetch` pour les composants Yaye, ROUTÉ PAR MÉTHODE.
 *
 * POURQUOI : depuis GUIC-540 (persistance du transcript), les composants Yaye font un
 * `GET /api/ia` AU MONTAGE (`fetchYayeHistory`) avant tout `POST /api/ia`. Les mocks à file
 * d'attente (`mockResolvedValueOnce`) servaient donc leur valeur au GET du montage, et le POST
 * recevait `undefined` → `res.headers` levait dans `streamYaye` (src/lib/ia/yaye-client.ts).
 * Les tests décrivaient les composants d'AVANT GUIC-540.
 *
 * Router par méthode rend le mock indifférent à l'ORDRE et au NOMBRE d'appels : il survivra au
 * prochain fetch ajouté au montage, au lieu de casser en silence.
 */

export interface YayeFetchOptions {
  /** Charge utile `data` du POST /api/ia (reply, blocks, sessionId…). */
  reply?:   Record<string, unknown>
  /** Tours d'historique renvoyés par le GET /api/ia au montage. */
  history?: unknown[]
}

/** Installe le routage sur un `jest.fn()` déjà branché sur `global.fetch`. */
export function routeYayeFetch(mockFetch: jest.Mock, opts: YayeFetchOptions = {}): void {
  mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (method === 'GET') {
      // Historique au montage : conversation vide par défaut.
      return Promise.resolve({ ok: true, json: async () => ({ data: { turns: opts.history ?? [] } }) })
    }
    // Réponse de l'agent. JSON (non-SSE) → `streamYaye` prend la branche `json()`.
    return Promise.resolve({ ok: true, json: async () => ({ data: opts.reply ?? {} }) })
  })
}

/** Les appels POST /api/ia — c'est ce que « envoyer un message » signifie vraiment. */
export function yayePostCalls(mockFetch: jest.Mock): unknown[][] {
  return mockFetch.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
}
