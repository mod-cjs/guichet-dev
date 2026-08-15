/**
 * @jest-environment node
 *
 * GUIC-706 — Bascule en groupe de cohérence (étape A).
 *
 * Le service refuse déjà de masquer un parent dont un enfant est ouvert, et le message dit
 * ce qui bloque. Il ne dit pas comment faire : l'administrateur doit deviner l'ordre et
 * enchaîner les bascules à la main. C'est ce trajet manuel qui produit les états
 * incohérents — une séquence interrompue laisse un parent ouvert et ses enfants fermés,
 * exactement ce que les dépendances existent pour interdire.
 */
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
  prisma: { featureFlag: { findMany: (...a: unknown[]) => mockFindMany(...a), upsert: (...a: unknown[]) => mockUpsert(...a) } },
}))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { cascadeMasquage, cascadeOuverture } from '@/lib/flags/cascade'
import { setFlags, __resetFlagsCache } from '@/lib/flags'
import { catalogDefaults, FEATURE_FLAGS, getFlagDef } from '@/lib/flags/catalog'

/** Un flag ayant au moins un dépendant — les cascades n'ont d'intérêt que là. */
const PARENT = FEATURE_FLAGS.find(
  (f) => !f.locked && FEATURE_FLAGS.some((o) => o.dependsOn.includes(f.key)),
)!
/** Une feuille : ni dépendant, ni verrou. */
const FEUILLE = FEATURE_FLAGS.find(
  (f) => !f.locked && f.dependsOn.length === 0 && !FEATURE_FLAGS.some((o) => o.dependsOn.includes(f.key)),
)!

beforeEach(() => {
  jest.clearAllMocks()
  __resetFlagsCache()
  mockRedisGet.mockResolvedValue(null)
  mockRedisSet.mockResolvedValue('OK')
  mockRedisIncr.mockResolvedValue(2)
  mockFindMany.mockResolvedValue([])
  mockUpsert.mockResolvedValue({})
})

describe('cascadeMasquage — ordre', () => {
  it('finit par la fonctionnalité demandée', () => {
    expect(cascadeMasquage(PARENT.key).at(-1)).toBe(PARENT.key)
  })

  it('place chaque dépendant AVANT ce dont il dépend', () => {
    // C'est tout l'objet de l'ordre : masquer un parent avant ses enfants serait refusé
    // par le service, et laisserait la séquence à moitié appliquée.
    const ordre = cascadeMasquage(PARENT.key)
    for (const key of ordre) {
      for (const dep of getFlagDef(key)!.dependsOn) {
        if (ordre.includes(dep)) expect(ordre.indexOf(key)).toBeLessThan(ordre.indexOf(dep))
      }
    }
  })

  it('remonte les dépendances indirectes', () => {
    // Un petit-enfant doit être masqué avant l'enfant, qui l'est avant le parent.
    const grandParent = FEATURE_FLAGS.find((f) =>
      FEATURE_FLAGS.some((e) => e.dependsOn.includes(f.key) && FEATURE_FLAGS.some((p) => p.dependsOn.includes(e.key))),
    )
    if (!grandParent) return
    expect(cascadeMasquage(grandParent.key).length).toBeGreaterThan(2)
  })

  it('se réduit à la fonctionnalité seule quand rien n’en dépend', () => {
    expect(cascadeMasquage(FEUILLE.key)).toEqual([FEUILLE.key])
  })

  it('ne répète jamais une clé', () => {
    // Un même flag peut être atteint par deux chemins du graphe. Le laisser en double
    // ferait basculer deux fois et fausserait le décompte annoncé à l'administrateur.
    for (const f of FEATURE_FLAGS) {
      const ordre = cascadeMasquage(f.key)
      expect(new Set(ordre).size).toBe(ordre.length)
    }
  })
})

describe('cascadeOuverture — ordre', () => {
  it('finit par la fonctionnalité demandée', () => {
    const enfant = FEATURE_FLAGS.find((f) => f.dependsOn.length > 0)!
    expect(cascadeOuverture(enfant.key).at(-1)).toBe(enfant.key)
  })

  it('place chaque dépendance AVANT ce qui en dépend', () => {
    // L'ordre s'inverse : à l'ouverture on remonte les dépendances, pas les dépendants.
    const enfant = FEATURE_FLAGS.find((f) => f.dependsOn.length > 0)!
    const ordre = cascadeOuverture(enfant.key)
    for (const key of ordre) {
      for (const dep of getFlagDef(key)!.dependsOn) {
        if (ordre.includes(dep)) expect(ordre.indexOf(dep)).toBeLessThan(ordre.indexOf(key))
      }
    }
  })

  it('ne remonte pas les dépendants', () => {
    // Ouvrir un parent ne doit pas ouvrir ses enfants : l'administrateur choisit ce qu'il
    // rend disponible, il ne se le voit pas imposer.
    const ordre = cascadeOuverture(PARENT.key)
    const enfants = FEATURE_FLAGS.filter((f) => f.dependsOn.includes(PARENT.key)).map((f) => f.key)
    for (const e of enfants) expect(ordre).not.toContain(e)
  })
})

describe('setFlags — application de la séquence', () => {
  it('applique toutes les bascules', async () => {
    const ordre = cascadeMasquage(PARENT.key)
    await setFlags(ordre.map((key) => ({ key, enabled: false })), { updatedBy: 'a1' })
    expect(mockUpsert).toHaveBeenCalledTimes(ordre.length)
  })

  it('rend la carte finale, pas un état intermédiaire', async () => {
    const ordre = cascadeMasquage(PARENT.key)
    const map = await setFlags(ordre.map((key) => ({ key, enabled: false })), { updatedBy: 'a1' })
    for (const key of ordre) expect(map[key]).toBe(false)
  })

  it('n’écrit rien du tout si une bascule de la séquence est refusée', async () => {
    // Sans atomicité, une séquence interrompue laisse un parent ouvert et ses enfants
    // fermés — l'état incohérent que les dépendances servent à empêcher. Mieux vaut ne
    // rien faire que faire à moitié.
    const verrouille = FEATURE_FLAGS.find((f) => f.locked)!.key
    await expect(
      setFlags(
        [{ key: FEUILLE.key, enabled: false }, { key: verrouille, enabled: false }],
        { updatedBy: 'a1' },
      ),
    ).rejects.toThrow()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('refuse une séquence vide plutôt que de publier une carte inchangée', async () => {
    await expect(setFlags([], { updatedBy: 'a1' })).rejects.toThrow()
  })

  it('ne publie la version qu’une fois pour toute la séquence', async () => {
    // Un INCR par bascule ferait relire la carte à chaque étape sur toutes les instances,
    // et exposerait les états intermédiaires de la séquence.
    const ordre = cascadeMasquage(PARENT.key)
    await setFlags(ordre.map((key) => ({ key, enabled: false })), { updatedBy: 'a1' })
    expect(mockRedisIncr).toHaveBeenCalledTimes(1)
  })

  it('reste cohérente avec l’état de départ', async () => {
    mockFindMany.mockResolvedValue([{ key: FEUILLE.key, enabled: false }])
    const map = await setFlags([{ key: FEUILLE.key, enabled: true }], { updatedBy: 'a1' })
    expect(map).toEqual({ ...catalogDefaults(), [FEUILLE.key]: true })
  })
})
