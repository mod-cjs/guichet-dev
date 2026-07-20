import { streamYaye, fetchYayeHistory, type YayeDone } from '@/lib/ia/yaye-client'

// Réponses factices imitant fetch(). Le chemin SSE lit `res.body.getReader()` ;
// le chemin fallback lit `res.json()` quand le content-type n'est pas SSE.
function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  let i = 0
  return {
    ok: true,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'text/event-stream' : null) },
    body: {
      getReader() {
        return {
          read() {
            if (i < chunks.length) return Promise.resolve({ value: encoder.encode(chunks[i++]), done: false })
            return Promise.resolve({ value: undefined, done: true })
          },
        }
      },
    },
  } as unknown as Response
}

function jsonResponse(payload: unknown, contentType = 'application/json'): Response {
  return {
    ok: true,
    body: null,
    headers: { get: () => contentType },
    json: async () => payload,
  } as unknown as Response
}

/** Construit un event SSE brut `event: x\ndata: {...}\n\n`. */
function ev(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// L'environnement node n'expose pas forcément fetch : on l'installe nous-mêmes.
const mockFetch = jest.fn()
beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
})

function handlers() {
  const tokens: string[] = []
  const tools: string[] = []
  let done: YayeDone | undefined
  const errors: (string | undefined)[] = []
  return {
    tokens,
    tools,
    getDone: () => done,
    errors,
    h: {
      onToken: (t: string) => tokens.push(t),
      onTool: (n: string) => tools.push(n),
      onDone: (d: YayeDone) => { done = d },
      onError: (m?: string) => errors.push(m),
    },
  }
}

describe('streamYaye — chemin SSE', () => {
  afterEach(() => jest.restoreAllMocks())

  it('émet les tokens, les outils puis la réponse finale (done)', async () => {
    const stream = sseResponse([
      ev('tool', { name: 'search_opportunities' }),
      ev('token', { text: 'Voici ' }),
      ev('token', { text: 'une offre.' }),
      ev('done', { reply: 'Voici une offre.', blocks: [{ kind: 'text', text: 'Voici une offre.' }], sessionId: 's1' }),
    ])
    mockFetch.mockResolvedValue(stream)

    const c = handlers()
    await streamYaye({ message: 'salut' }, c.h)

    expect(c.tools).toEqual(['search_opportunities'])
    expect(c.tokens).toEqual(['Voici ', 'une offre.'])
    expect(c.getDone()).toEqual(
      expect.objectContaining({ reply: 'Voici une offre.', sessionId: 's1' }),
    )
    expect(c.errors).toEqual([])
  })

  it('réassemble un événement fragmenté sur deux chunks', async () => {
    // L'événement `token` est coupé en plein milieu du JSON entre deux read().
    const stream = sseResponse(['event: token\ndata: {"te', 'xt":"Bonjour"}\n\n'])
    mockFetch.mockResolvedValue(stream)

    const c = handlers()
    await streamYaye({ message: 'x' }, c.h)

    expect(c.tokens).toEqual(['Bonjour'])
  })

  it('propage un événement error du serveur avec son message en personnage', async () => {
    const stream = sseResponse([ev('error', { message: 'Trop de messages, souffle un peu.' })])
    mockFetch.mockResolvedValue(stream)

    const c = handlers()
    await streamYaye({ message: 'x' }, c.h)

    expect(c.errors).toEqual(['Trop de messages, souffle un peu.'])
  })

  it('appelle onError si la lecture du flux échoue en cours de route', async () => {
    const failing = {
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: { getReader: () => ({ read: () => Promise.reject(new Error('reset')) }) },
    } as unknown as Response
    mockFetch.mockResolvedValue(failing)

    const c = handlers()
    await streamYaye({ message: 'x' }, c.h)

    expect(c.errors.length).toBe(1)
    expect(c.getDone()).toBeUndefined()
  })
})

describe('streamYaye — chemin fallback JSON', () => {
  afterEach(() => jest.restoreAllMocks())

  it('retombe sur le JSON quand le content-type n’est pas SSE', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data: { reply: 'Réponse JSON', blocks: [{ kind: 'text', text: 'Réponse JSON' }], sessionId: 's2' } }),
    )

    const c = handlers()
    await streamYaye({ message: 'x' }, c.h)

    expect(c.getDone()).toEqual(expect.objectContaining({ reply: 'Réponse JSON', sessionId: 's2' }))
  })

  it('utilise le message d’erreur serveur comme reply si data absent', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: { message: 'Réessaie plus tard.' } }),
    )

    const c = handlers()
    await streamYaye({ message: 'x' }, c.h)

    expect(c.getDone()?.reply).toBe('Réessaie plus tard.')
    expect(c.getDone()?.blocks).toEqual([{ kind: 'text', text: 'Réessaie plus tard.' }])
  })

  it('appelle onError si le corps JSON est illisible', async () => {
    const bad = {
      ok: true,
      body: null,
      headers: { get: () => 'application/json' },
      json: async () => { throw new Error('bad json') },
    } as unknown as Response
    mockFetch.mockResolvedValue(bad)

    const c = handlers()
    await streamYaye({ message: 'x' }, c.h)

    expect(c.errors.length).toBe(1)
  })
})

describe('streamYaye — échec réseau', () => {
  afterEach(() => jest.restoreAllMocks())

  it('appelle onError sans throw si fetch rejette', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))

    const c = handlers()
    await expect(streamYaye({ message: 'x' }, c.h)).resolves.toBeUndefined()
    expect(c.errors).toEqual([undefined])
  })
})

describe('fetchYayeHistory', () => {
  afterEach(() => jest.restoreAllMocks())

  it('renvoie les tours restaurés', async () => {
    const turns = [{ role: 'user', text: 'salut' }, { role: 'assistant', text: 'bonjour' }]
    mockFetch.mockResolvedValue(jsonResponse({ data: { turns } }))

    await expect(fetchYayeHistory()).resolves.toEqual(turns)
  })

  it('renvoie [] si la réponse n’est pas ok', async () => {
    mockFetch.mockResolvedValue({ ok: false } as unknown as Response)
    await expect(fetchYayeHistory()).resolves.toEqual([])
  })

  it('renvoie [] si fetch rejette (fail-soft)', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))
    await expect(fetchYayeHistory()).resolves.toEqual([])
  })

  it('renvoie [] si le JSON ne contient pas de turns', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: {} }))
    await expect(fetchYayeHistory()).resolves.toEqual([])
  })
})
