/**
 * @jest-environment node
 *
 * GUIC-706 — Checklist de pré-ouverture (fin d'étape B).
 *
 * L'ouverture est le geste le plus risqué, et celui auquel on pense le moins. Un module
 * resté masqué des semaines s'ouvre sur des tâches jamais exécutées : les recommandations
 * n'ont rien précalculé, le graphe n'a rien projeté. L'utilisateur découvre un module vide
 * et n'y revient pas — un lancement raté ne se rattrape pas, l'attention ne se redonne pas.
 *
 * La checklist ne bloque pas : elle informe. Ouvrir malgré un avertissement doit rester
 * possible — mais jamais par inadvertance.
 */
const mockCount = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: new Proxy({}, { get: () => ({ count: (...a: unknown[]) => mockCount(...a) }) }),
}))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { checklistOuverture } from '@/lib/flags/prelaunch'
import { FEATURE_FLAGS } from '@/lib/flags/catalog'

const AVEC_CRONS = FEATURE_FLAGS.find((f) => f.crons.length > 0)!
const SANS_CRON = FEATURE_FLAGS.find((f) => f.crons.length === 0 && !f.locked)!

beforeEach(() => {
  jest.clearAllMocks()
  mockCount.mockResolvedValue(0)
})

describe('checklistOuverture', () => {
  it('signale les tâches planifiées restées à l’arrêt', async () => {
    // Ce sont elles qui préparent la donnée : les taire ferait ouvrir sur du vide sans
    // que personne ne comprenne pourquoi.
    const c = await checklistOuverture(AVEC_CRONS.key)
    expect(c.crons).toEqual(AVEC_CRONS.crons)
  })

  it('ne signale rien à préchauffer quand la fonctionnalité n’a pas de tâche', async () => {
    const c = await checklistOuverture(SANS_CRON.key)
    expect(c.crons).toHaveLength(0)
  })

  it('avertit quand le module n’a aucun contenu à montrer', async () => {
    // « 0 événement publié » le jour de l'ouverture est le pire scénario : la
    // fonctionnalité marche, elle est simplement vide, et l'utilisateur conclut qu'elle
    // ne sert à rien.
    mockCount.mockResolvedValue(0)
    const c = await checklistOuverture('m5.agenda')
    expect(c.avertissements.some((a) => /aucun contenu|vide/i.test(a))).toBe(true)
  })

  it('n’avertit pas quand le module a du contenu', async () => {
    mockCount.mockResolvedValue(42)
    const c = await checklistOuverture('m5.agenda')
    expect(c.contenu).toBe(42)
    expect(c.avertissements.some((a) => /aucun contenu|vide/i.test(a))).toBe(false)
  })

  it('signale une dépendance encore masquée', async () => {
    // Ouvrir un enfant dont le parent est fermé sera refusé par le service ; l'annoncer
    // ici évite un aller-retour et dit quoi ouvrir d'abord.
    const enfant = FEATURE_FLAGS.find((f) => f.dependsOn.length > 0)!
    const c = await checklistOuverture(enfant.key, { [enfant.dependsOn[0]]: false })
    expect(c.avertissements.some((a) => a.includes(enfant.dependsOn[0]))).toBe(true)
  })

  it('reste consultable si la base est muette', async () => {
    // Une checklist indisponible ne doit pas empêcher d'ouvrir : elle informe une
    // décision, elle ne la conditionne pas.
    mockCount.mockRejectedValue(new Error('panne'))
    await expect(checklistOuverture('m5.agenda')).resolves.toBeDefined()
  })

  it('ne bloque jamais — elle rend des avertissements, pas un refus', async () => {
    mockCount.mockResolvedValue(0)
    const c = await checklistOuverture('m5.agenda')
    expect(c).not.toHaveProperty('bloquant')
    expect(Array.isArray(c.avertissements)).toBe(true)
  })
})
