/**
 * @jest-environment node
 *
 * Concurrence & multi-session (GUIC-678). Trois angles morts de l'audit multi-utilisateur :
 *  c1 — les outils d'écriture ne marchaient pas sur WhatsApp (aucun cookie → 401) ;
 *  c2 — deux messages simultanés de la même personne se perdaient (read-modify-write) ;
 *  c3 — le sessionId WhatsApp était éternel (escalades bloquées, métriques faussées).
 */

// ── Redis simulé : listes + clés simples, avec la vraie erreur WRONGTYPE ───────
// (défini DANS la factory : jest hisse les `jest.mock` au-dessus des `const`.)
jest.mock('@/lib/redis', () => {
  type Entry = { type: 'string' | 'list'; value: string | string[] }
  const store = new Map<string, Entry>()
  const wrongType = () => new Error('WRONGTYPE Operation against a key holding the wrong kind of value')
  const borne = (list: string[], start: number, stop: number) => {
    const s = start < 0 ? Math.max(0, list.length + start) : start
    const t = stop < 0 ? list.length + stop : stop
    return list.slice(s, t + 1)
  }
  return {
    __store: store,
    redis: {
      get: jest.fn(async (k: string) => {
        const e = store.get(k)
        if (!e) return null
        if (e.type === 'list') throw wrongType()
        return e.value as string
      }),
      set: jest.fn(async (k: string, v: string) => { store.set(k, { type: 'string', value: v }); return 'OK' }),
      del: jest.fn(async (k: string) => { store.delete(k); return 1 }),
      expire: jest.fn(async () => 1),
      rpush: jest.fn(async (k: string, ...vals: string[]) => {
        const e = store.get(k)
        if (e && e.type === 'string') throw wrongType()
        const list = (e?.value as string[]) ?? []
        list.push(...vals)
        store.set(k, { type: 'list', value: list })
        return list.length
      }),
      lrange: jest.fn(async (k: string, start: number, stop: number) => {
        const e = store.get(k)
        if (!e) return []
        if (e.type === 'string') throw wrongType()
        return borne(e.value as string[], start, stop)
      }),
      ltrim: jest.fn(async (k: string, start: number, stop: number) => {
        const e = store.get(k)
        if (!e || e.type === 'string') return 'OK'
        store.set(k, { type: 'list', value: borne(e.value as string[], start, stop) })
        return 'OK'
      }),
    },
  }
})
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

const mockEncodeSession = jest.fn(async (_session: unknown) => 'jeton-ephemere')
jest.mock('@/lib/auth', () => ({ encodeSession: (session: unknown) => mockEncodeSession(session) }))

const mockUserFindUnique = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { utilisateur: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) } } }))

import { appendTurns, loadContext, userContextKey, TTL_USER } from '@/lib/ia/context'
import { resolveWhatsAppSessionId, waSessionKey } from '@/lib/ia/whatsapp-session'
import { buildActorCookieHeader } from '@/lib/ia/actor-session'
import { preScreen } from '@/lib/ia/pre-screen'
import * as redisModule from '@/lib/redis'

const redisMock = redisModule.redis as unknown as Record<string, jest.Mock>
const store = (redisModule as unknown as { __store: Map<string, { type: string; value: unknown }> }).__store

const KEY = userContextKey('u-1')

const actif = {
  cjsUid: 'u-1', nom: 'Diop', prenom: 'Awa', email: null, telephone: '+221770000000',
  region: 'Thies', role: 'beneficiaire', onboardingComplete: true, statut: 'actif', deletedAt: null,
}

beforeEach(() => {
  store.clear()
  jest.clearAllMocks()
  mockUserFindUnique.mockResolvedValue(actif)
})

// ── c2 — historique atomique ──────────────────────────────────────────────────

test('deux tours concurrents : AUCUN n’est perdu (append atomique)', async () => {
  // Les deux requêtes lisent le même état initial, puis écrivent « en même temps ».
  await Promise.all([
    appendTurns(KEY, [{ role: 'user', content: 'A' }, { role: 'assistant', content: 'ra' }], TTL_USER),
    appendTurns(KEY, [{ role: 'user', content: 'B' }, { role: 'assistant', content: 'rb' }], TTL_USER),
  ])

  const contenus = (await loadContext(KEY)).map(t => t.content)
  expect(contenus).toContain('A')
  expect(contenus).toContain('B') // avec l'ancien read-modify-write, l'un des deux disparaissait
  expect(contenus).toHaveLength(4)
})

test('l’historique reste borné à 20 tours (coût/latence)', async () => {
  for (let i = 0; i < 15; i++) {
    await appendTurns(KEY, [{ role: 'user', content: `q${i}` }, { role: 'assistant', content: `r${i}` }], TTL_USER)
  }
  const turns = await loadContext(KEY)
  expect(turns).toHaveLength(20)
  expect(turns[turns.length - 1].content).toBe('r14') // on garde les plus RÉCENTS
})

test('clé au format précédent (chaîne JSON) : migrée par purge, sans exception', async () => {
  store.set('yaye:ctx:' + KEY, { type: 'string', value: JSON.stringify([{ role: 'user', content: 'ancien' }]) })

  expect(await loadContext(KEY)).toEqual([])
  await appendTurns(KEY, [{ role: 'user', content: 'nouveau' }], TTL_USER)
  expect((await loadContext(KEY)).map(t => t.content)).toEqual(['nouveau'])
})

test('Redis en panne → fail-soft, jamais d’exception', async () => {
  redisMock.rpush.mockRejectedValueOnce(new Error('redis down'))
  redisMock.lrange.mockRejectedValueOnce(new Error('redis down'))

  await expect(appendTurns(KEY, [{ role: 'user', content: 'x' }], TTL_USER)).resolves.toBeUndefined()
  await expect(loadContext(KEY)).resolves.toEqual([])
})

// ── c3 — session WhatsApp roulante ────────────────────────────────────────────

test('même conversation active : la session est STABLE et son TTL glisse', async () => {
  const s1 = await resolveWhatsAppSessionId('conv-1')
  const s2 = await resolveWhatsAppSessionId('conv-1')

  expect(s2).toBe(s1)
  expect(redisMock.expire).toHaveBeenCalledWith(waSessionKey('conv-1'), 24 * 3600)
})

test('après la fenêtre d’inactivité : NOUVELLE session (escalades débloquées)', async () => {
  const s1 = await resolveWhatsAppSessionId('conv-1')
  store.delete(waSessionKey('conv-1')) // expiration Redis
  const s2 = await resolveWhatsAppSessionId('conv-1')

  expect(s2).not.toBe(s1)
})

test('deux conversations distinctes ne partagent jamais de session', async () => {
  expect(await resolveWhatsAppSessionId('conv-1')).not.toBe(await resolveWhatsAppSessionId('conv-2'))
})

test('Redis KO → repli sur l’id de conversation (comportement d’avant)', async () => {
  redisMock.get.mockRejectedValueOnce(new Error('redis down'))
  expect(await resolveWhatsAppSessionId('conv-9')).toBe('conv-9')
})

// ── c1 — identité propagée aux appels internes ────────────────────────────────

test('compte actif : session éphémère frappée, sans jeton SSO et à durée courte', async () => {
  const header = await buildActorCookieHeader('u-1')

  expect(header).toBe('cjs_session=jeton-ephemere')
  const claims = mockEncodeSession.mock.calls[0][0] as unknown as {
    cjsUid: string; roles: string[]; accessToken: string; refreshToken: string; expiresAt: number
  }
  expect(claims.cjsUid).toBe('u-1')
  expect(claims.roles).toEqual(['beneficiaire'])
  // Identité applicative UNIQUEMENT : pas de jeton SSO embarqué.
  expect(claims.accessToken).toBe('')
  expect(claims.refreshToken).toBe('')
  expect(claims.expiresAt - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(60)
})

test('compte suspendu ou anonymisé : AUCUNE identité frappée', async () => {
  mockUserFindUnique.mockResolvedValueOnce({ ...actif, statut: 'suspendu' })
  expect(await buildActorCookieHeader('u-1')).toBeNull()

  mockUserFindUnique.mockResolvedValueOnce({ ...actif, deletedAt: new Date() })
  expect(await buildActorCookieHeader('u-1')).toBeNull()

  mockUserFindUnique.mockResolvedValueOnce(null)
  expect(await buildActorCookieHeader('inconnu')).toBeNull()
  expect(mockEncodeSession).not.toHaveBeenCalled()
})

// ── c4 — plus d'état partagé entre utilisateurs ───────────────────────────────

test('deux personnes saluées au même instant ne reçoivent pas la même phrase', () => {
  const a = preScreen('bonjour', true, 'user-A')
  const b = preScreen('bonjour', true, 'user-B')
  expect(a?.reply).not.toBe(b?.reply)
})

test('la même personne voit quand même ses formules varier d’un tour à l’autre', () => {
  const r1 = preScreen('bonjour', true, 'user-A')
  const r2 = preScreen('bonjour', true, 'user-A')
  expect(r1?.reply).not.toBe(r2?.reply)
})
