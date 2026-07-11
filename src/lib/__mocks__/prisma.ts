/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GUIC-538 — Manual mock PARTAGÉ de `@/lib/prisma`.
 *
 * Problème résolu : jusqu'ici chaque test refaisait sa propre factory
 * `jest.mock('@/lib/prisma', () => ({ prisma: { modele: { methode: jest.fn() } } }))`.
 * Dès qu'un code source gagnait un nouvel appel Prisma (`prisma.x.nouvelleMethode`),
 * la factory du test devenait obsolète → `TypeError: ... is not a function` (ou une
 * valeur `undefined` avalée par un try/catch). C'est la cause des lots A & B.
 *
 * Ce mock expose un `prisma` où **toute** `prisma.<modele>.<methode>` (et tout helper
 * `$transaction`, `$queryRaw`, …) est **automatiquement** un `jest.fn()`, stable en
 * identité entre accès (indispensable pour `toHaveBeenCalled*`). Un test n'a donc plus
 * qu'à configurer les retours qui l'intéressent — il ne peut plus se désynchroniser.
 *
 * Les méthodes auto-générées sont de vrais `jest.fn()` : `jest.clearAllMocks()`
 * (appels) et `jest.resetAllMocks()` (appels + implémentations) les nettoient
 * normalement — pas besoin d'un reset maison.
 *
 * ## Usage
 * ```ts
 * jest.mock('@/lib/prisma')                       // ← forme "bare" : utilise CE mock
 * import { prisma } from '@/lib/prisma'
 *
 * beforeEach(() => jest.clearAllMocks())
 * it('...', async () => {
 *   ;(prisma.utilisateur.findUnique as jest.Mock).mockResolvedValue({ cjsUid: 'u1' })
 *   // ...
 * })
 * ```
 */

// Registre des jest.fn() par clé `modele.methode` (ou `$methode`) → identité stable.
const registry = new Map<string, jest.Mock>()

function mockFn(key: string): jest.Mock {
  let fn = registry.get(key)
  if (!fn) {
    fn = jest.fn()
    registry.set(key, fn)
  }
  return fn
}

// Propriétés à NE PAS transformer en jest.fn() : sinon le mock devient "thenable"
// (casse les `await prisma…`) ou perturbe l'introspection / les matchers Jest.
const PASSTHROUGH = new Set<string | symbol>([
  'then', 'catch', 'finally', 'constructor', 'prototype',
  'asymmetricMatch', '$$typeof', 'nodeType', 'toJSON', 'Symbol(util.inspect.custom)',
])

function isReserved(prop: string | symbol): boolean {
  return typeof prop === 'symbol' || PASSTHROUGH.has(prop)
}

/** Délégué d'un modèle : `prisma.utilisateur.findUnique` → jest.fn() mémorisé. */
function modelProxy(model: string): any {
  return new Proxy({}, {
    get(_t, prop) {
      if (isReserved(prop)) return undefined
      return mockFn(`${model}.${String(prop)}`)
    },
  })
}

export const prisma: any = new Proxy({}, {
  get(_t, prop) {
    if (isReserved(prop)) return undefined
    const name = String(prop)
    // Helpers client de premier niveau ($transaction, $queryRaw, $connect, …).
    if (name.startsWith('$')) return mockFn(name)
    // Sinon : un modèle Prisma (utilisateur, opportunite, evenement, …).
    return modelProxy(name)
  },
})
