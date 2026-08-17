/**
 * @jest-environment node
 *
 * GUIC-706 — Fermeture progressive et engagements en cours (étape B).
 *
 * Une réservation acceptée, un emprunt en cours, une candidature en instruction sont des
 * engagements pris ENVERS l'utilisateur. Les rendre invisibles ne les annule pas : ça le
 * prive du moyen de les honorer. Un jeune qui a un livre chez lui perdrait sa date de
 * retour et passerait en retard sans le savoir.
 *
 * D'où la distinction entre l'ENTRÉE d'un module — emprunter, réserver, s'inscrire — et sa
 * SORTIE — consulter ce qu'on a déjà. La première ferme, la seconde reste ouverte à ceux
 * qui ont un engagement, et à eux seuls.
 */
const mockCount = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: new Proxy({}, { get: () => ({ count: (...a: unknown[]) => mockCount(...a) }) }),
}))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { compteEngagements, aUnEngagement } from '@/lib/flags/engagements'
import { FEATURE_FLAGS, getFlagDef } from '@/lib/flags/catalog'

const DRAIN = FEATURE_FLAGS.filter((f) => f.closeMode === 'drain')
const UN_DRAIN = DRAIN[0]
const UN_SEC = FEATURE_FLAGS.find((f) => f.closeMode === 'sec' && !f.locked)!

beforeEach(() => {
  jest.clearAllMocks()
  mockCount.mockResolvedValue(0)
})

describe('catalogue — routes de sortie', () => {
  it('donne une route de sortie à chaque fermeture progressive', () => {
    // Sans elle, le mode `drain` n'est qu'une intention : rien ne dit PAR OÙ le titulaire
    // consulte son engagement une fois l'entrée fermée.
    for (const f of DRAIN) {
      expect(f.drainRoutes.length).toBeGreaterThan(0)
    }
  })

  it('n’attribue de route de sortie qu’aux fermetures progressives', () => {
    for (const f of FEATURE_FLAGS.filter((x) => x.closeMode === 'sec')) {
      expect(f.drainRoutes).toHaveLength(0)
    }
  })

  it('choisit des routes de sortie parmi les routes du module', () => {
    // Une sortie hors du périmètre du flag serait ouverte par une autre règle, et le
    // drain n'aurait aucun effet observable.
    for (const f of DRAIN) {
      for (const sortie of f.drainRoutes) {
        expect(f.userRoutes.some((r) => sortie === r || sortie.startsWith(r + '/'))).toBe(true)
      }
    }
  })
})

describe('compteEngagements — décompte pour l’administrateur', () => {
  it('compte les engagements actifs d’une fermeture progressive', async () => {
    mockCount.mockResolvedValue(47)
    await expect(compteEngagements(UN_DRAIN.key)).resolves.toBe(47)
  })

  it('interroge le modèle et les états déclarés au catalogue', async () => {
    await compteEngagements(UN_DRAIN.key)
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ statut: { in: UN_DRAIN.engagements!.activeStates } }),
      }),
    )
  })

  it('rend zéro pour une fermeture sèche', async () => {
    // Rien à écouler : personne n'attend rien.
    await expect(compteEngagements(UN_SEC.key)).resolves.toBe(0)
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('rend zéro plutôt que d’échouer si la base est muette', async () => {
    // Le décompte informe une décision ; son absence ne doit pas empêcher de la prendre.
    mockCount.mockRejectedValue(new Error('panne'))
    await expect(compteEngagements(UN_DRAIN.key)).resolves.toBe(0)
  })
})

describe('aUnEngagement — droit de passage du titulaire', () => {
  it('reconnaît un utilisateur qui a un engagement en cours', async () => {
    mockCount.mockResolvedValue(1)
    await expect(aUnEngagement(UN_DRAIN.key, 'uid-1')).resolves.toBe(true)
  })

  it('refuse un utilisateur qui n’en a aucun', async () => {
    mockCount.mockResolvedValue(0)
    await expect(aUnEngagement(UN_DRAIN.key, 'uid-1')).resolves.toBe(false)
  })

  it('restreint le décompte à CET utilisateur', async () => {
    // Sans le filtre, n'importe qui passerait dès qu'un engagement existe quelque part —
    // et la sortie deviendrait une porte ouverte à tous.
    await aUnEngagement(UN_DRAIN.key, 'uid-1')
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ cjsUid: 'uid-1' }) }),
    )
  })

  it('refuse sans utilisateur', async () => {
    await expect(aUnEngagement(UN_DRAIN.key, null)).resolves.toBe(false)
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('refuse pour une fermeture sèche', async () => {
    await expect(aUnEngagement(UN_SEC.key, 'uid-1')).resolves.toBe(false)
  })

  it('refuse si la base est muette', async () => {
    // Ici le repli est FERMÉ, à l'inverse du décompte : laisser passer sur une panne
    // rouvrirait la sortie à tout le monde, c'est-à-dire au public qu'on masque.
    mockCount.mockRejectedValue(new Error('panne'))
    await expect(aUnEngagement(UN_DRAIN.key, 'uid-1')).resolves.toBe(false)
  })
})

describe('cohérence du catalogue', () => {
  it('déclare un modèle Prisma plausible pour chaque fermeture progressive', () => {
    for (const f of DRAIN) {
      const e = getFlagDef(f.key)!.engagements!
      expect(e.model).toMatch(/^[a-z][A-Za-z]+$/)
      expect(e.activeStates.length).toBeGreaterThan(0)
      expect(e.label.length).toBeGreaterThan(0)
    }
  })
})
