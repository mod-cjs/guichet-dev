/**
 * @jest-environment node
 *
 * GUIC-706 — Résolution de l'état des fonctionnalités.
 *
 * Trois propriétés, chacune tirée d'un mode de défaillance réel (spec §8.1) :
 *   1. COHÉRENCE — le compteur `flags:version` fait qu'une bascule est vue par toutes les
 *      instances à la requête suivante. Sans lui, une page rendue par l'instance A
 *      (module ouvert) déclenche un fetch qui atterrit sur l'instance B (module masqué) :
 *      404 en plein écran sur une page qui vient de s'afficher.
 *   2. FRUGALITÉ — tant que la version ne bouge pas, on ne relit jamais la carte. Sinon on
 *      aurait remplacé un cache par un appel réseau permanent sur le chemin critique.
 *   3. FAIL-SOFT ORIENTÉ — Redis muet ⇒ on sert la DERNIÈRE CARTE CONNUE, jamais les
 *      défauts du catalogue : une coupure Redis rouvrirait sinon au public exactement ce
 *      qu'on vient de masquer.
 */
// `tests/setup.ts` neutralise `@/lib/flags` pour toutes les suites (tout ouvert, sans
// I/O). Celle-ci éprouve précisément le module réel : elle lève donc le mock global.
jest.unmock('@/lib/flags')

const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()
const mockRedisIncr = jest.fn()
const mockFindMany = jest.fn()
const mockUpsert = jest.fn()

jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockRedisGet(...a),
    set: (...a: unknown[]) => mockRedisSet(...a),
    incr: (...a: unknown[]) => mockRedisIncr(...a),
  },
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    featureFlag: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      upsert: (...a: unknown[]) => mockUpsert(...a),
    },
  },
}))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { getFlags, isEnabled, setFlag, __resetFlagsCache } from '@/lib/flags'
import { catalogDefaults, FEATURE_FLAGS } from '@/lib/flags/catalog'

/**
 * Un flag masquable sans contrainte : ni verrouillé, ni parent d'un flag ouvert — masquer
 * un parent est légitimement refusé, ce que vérifie une suite dédiée. Choisi dynamiquement
 * pour que l'ajout d'une dépendance au catalogue ne casse pas ces tests-ci.
 */
const MASQUABLE = FEATURE_FLAGS.find(
  (f) => !f.locked && f.defaultEnabled && !FEATURE_FLAGS.some((o) => o.dependsOn.includes(f.key)),
)!.key
/** Un flag verrouillé — le socle, jamais désactivable. */
const VERROUILLE = FEATURE_FLAGS.find((f) => f.locked)!.key

/** Réponses Redis par clé, pour piloter version et carte indépendamment. */
function redisRepond({ version, carte }: { version: string | null; carte: string | null }) {
  mockRedisGet.mockImplementation(async (key: string) =>
    key === 'flags:version' ? version : key === 'flags:all' ? carte : null,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  __resetFlagsCache()
  mockRedisSet.mockResolvedValue('OK')
  mockRedisIncr.mockResolvedValue(2)
  mockFindMany.mockResolvedValue([])
  redisRepond({ version: '1', carte: null })
})

describe('getFlags — résolution', () => {
  it('part des défauts du catalogue quand la base ne porte aucune surcharge', async () => {
    await expect(getFlags()).resolves.toEqual(catalogDefaults())
  })

  it('applique les surcharges de la base par-dessus le catalogue', async () => {
    mockFindMany.mockResolvedValue([{ key: MASQUABLE, enabled: false }])
    await expect(getFlags()).resolves.toMatchObject({ [MASQUABLE]: false })
  })

  it('ignore une surcharge portant sur une clé disparue du catalogue', async () => {
    // Un flag retiré du code laisse sa ligne en base : elle ne doit pas réapparaître dans
    // la carte, sinon `isEnabled` répondrait sur une fonctionnalité qui n'existe plus.
    mockFindMany.mockResolvedValue([{ key: 'm0.disparu', enabled: false }])
    await expect(getFlags()).resolves.not.toHaveProperty('m0.disparu')
  })

  it('sert la carte mise en cache par Redis sans interroger la base', async () => {
    redisRepond({ version: '1', carte: JSON.stringify({ ...catalogDefaults(), [MASQUABLE]: false }) })
    await expect(getFlags()).resolves.toMatchObject({ [MASQUABLE]: false })
    expect(mockFindMany).not.toHaveBeenCalled()
  })
})

describe('getFlags — cohérence entre instances', () => {
  it('ne relit pas la carte tant que la version n’a pas changé', async () => {
    redisRepond({ version: '7', carte: JSON.stringify(catalogDefaults()) })
    await getFlags()
    const lecturesCarte = mockRedisGet.mock.calls.filter(([k]) => k === 'flags:all').length
    await getFlags()
    await getFlags()
    expect(mockRedisGet.mock.calls.filter(([k]) => k === 'flags:all')).toHaveLength(lecturesCarte)
  })

  it('relit la carte dès que la version change', async () => {
    redisRepond({ version: '7', carte: JSON.stringify(catalogDefaults()) })
    await expect(getFlags()).resolves.toMatchObject({ [MASQUABLE]: true })

    // Une autre instance bascule le flag : elle écrit la carte puis incrémente la version.
    redisRepond({
      version: '8',
      carte: JSON.stringify({ ...catalogDefaults(), [MASQUABLE]: false }),
    })
    await expect(getFlags()).resolves.toMatchObject({ [MASQUABLE]: false })
  })
})

describe('getFlags — dégradation', () => {
  it('conserve la dernière carte connue quand Redis devient muet', async () => {
    redisRepond({
      version: '3',
      carte: JSON.stringify({ ...catalogDefaults(), [MASQUABLE]: false }),
    })
    await getFlags()

    mockRedisGet.mockRejectedValue(new Error('redis down'))
    // Surtout PAS `catalogDefaults()` : le flag vient d'être masqué, une panne Redis ne
    // doit pas le rouvrir aux 22 000 utilisateurs.
    await expect(getFlags()).resolves.toMatchObject({ [MASQUABLE]: false })
  })

  it('retombe sur le catalogue au démarrage à froid si Redis et la base sont muets', async () => {
    mockRedisGet.mockRejectedValue(new Error('redis down'))
    mockFindMany.mockRejectedValue(new Error('db down'))
    await expect(getFlags()).resolves.toEqual(catalogDefaults())
  })

  it('ne propage jamais d’exception', async () => {
    mockRedisGet.mockRejectedValue(new Error('redis down'))
    mockFindMany.mockRejectedValue(new Error('db down'))
    await expect(getFlags()).resolves.toBeDefined()
  })
})

describe('isEnabled', () => {
  it('répond pour une clé connue', async () => {
    await expect(isEnabled(MASQUABLE)).resolves.toBe(true)
  })

  it('refuse une clé inconnue plutôt que de l’autoriser', async () => {
    // Défaut fermé : une faute de frappe dans un appelant ne doit pas ouvrir un accès.
    await expect(isEnabled('m0.inconnu')).resolves.toBe(false)
  })
})

describe('setFlag — validation', () => {
  it('refuse une clé absente du catalogue', async () => {
    await expect(setFlag('m0.inconnu', false, { updatedBy: 'u1' })).rejects.toThrow()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('refuse de masquer un flag verrouillé', async () => {
    await expect(setFlag(VERROUILLE, false, { updatedBy: 'u1' })).rejects.toThrow()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('refuse d’ouvrir un flag dont une dépendance est masquée', async () => {
    const enfant = FEATURE_FLAGS.find((f) => f.dependsOn.length > 0)
    if (!enfant) return
    mockFindMany.mockResolvedValue(enfant.dependsOn.map((key) => ({ key, enabled: false })))
    await expect(setFlag(enfant.key, true, { updatedBy: 'u1' })).rejects.toThrow()
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

describe('setFlag — écriture', () => {
  it('persiste la surcharge et rend la carte à jour', async () => {
    await expect(setFlag(MASQUABLE, false, { updatedBy: 'u1', note: 'vague 1' })).resolves.toMatchObject({
      [MASQUABLE]: false,
    })
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })

  it('incrémente la version pour que les autres instances relisent', async () => {
    // C'est cet `INCR` qui ferme la fenêtre d'incohérence : sans lui, les autres
    // instances garderaient leur carte jusqu'à expiration.
    await setFlag(MASQUABLE, false, { updatedBy: 'u1' })
    expect(mockRedisIncr).toHaveBeenCalledWith('flags:version')
  })

  it('écrit la carte avant d’incrémenter la version', async () => {
    // Ordre imposé : une instance qui verrait la nouvelle version avant la nouvelle carte
    // relirait l'ancienne et se croirait à jour jusqu'à la bascule suivante.
    const ordre: string[] = []
    mockRedisSet.mockImplementation(async () => { ordre.push('set'); return 'OK' })
    mockRedisIncr.mockImplementation(async () => { ordre.push('incr'); return 2 })
    await setFlag(MASQUABLE, false, { updatedBy: 'u1' })
    // On regarde les deux dernières opérations : la lecture de l'état courant peut avoir
    // repeuplé le cache au passage, ce qui produit un `set` antérieur sans rapport.
    expect(ordre.slice(-2)).toEqual(['set', 'incr'])
  })

  it('reste fonctionnel si Redis refuse l’écriture', async () => {
    // La base fait foi ; le cache n'est qu'une optimisation. Une panne Redis ne doit pas
    // empêcher l'admin de couper une fonctionnalité en incident.
    mockRedisSet.mockRejectedValue(new Error('redis down'))
    mockRedisIncr.mockRejectedValue(new Error('redis down'))
    await expect(setFlag(MASQUABLE, false, { updatedBy: 'u1' })).resolves.toBeDefined()
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })
})
