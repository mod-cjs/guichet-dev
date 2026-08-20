/**
 * @jest-environment node
 *
 * GUIC-689 — La mesure des consultations n'enregistrait RIEN sur les six pages
 * détail. Diagnostiqué au rendu, en dev (Turbopack) puis sur le serveur
 * standalone de production :
 *
 *   `after(() => trackVuePage({...}))`
 *
 * `trackVuePage` lit `headers()` (IP, user-agent) — mais il le lit DANS le
 * callback, exécuté une fois la réponse partie. Next refuse alors l'accès aux
 * données de requête : « Route /ressources/[id] used `headers` … ». Le
 * `catch` de `trackVuePage` avalait l'erreur en silence, et le compteur
 * `vues` restait à zéro sans que rien ne le signale — au point d'avoir dû
 * masquer l'étagère « Les plus consultées », faute de mesure.
 *
 * Preuve du diagnostic : le même appel en `await` direct enregistre bien,
 * `after()` fonctionne parfaitement dans une route handler, et Redis ne
 * portait aucune clé de dédoublonnage après une requête servie — le traceur
 * n'était jamais atteint.
 *
 * La correction : lire la requête AVANT, exécuter l'écriture APRÈS.
 */

import { differerVuePage } from '@/lib/analytics/consultation-server'

const mockHeaders = jest.fn()
jest.mock('next/headers', () => ({ headers: () => mockHeaders() }))

const mockTrackConsultation = jest.fn()
jest.mock('@/lib/analytics/consultations', () => {
  const reel = jest.requireActual('@/lib/analytics/consultations')
  return { ...reel, trackConsultation: (...a: unknown[]) => mockTrackConsultation(...a) }
})

function headersAvec(map: Record<string, string>) {
  return { get: (k: string) => map[k] ?? null }
}

/** Reproduit la fin de la portée de requête : après la réponse, Next refuse. */
function fermerLaPortee() {
  mockHeaders.mockImplementation(() => {
    throw new Error('Route /ressources/[id] used `headers` inside `after`')
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHeaders.mockResolvedValue(headersAvec({ 'x-real-ip': '41.82.13.7', 'user-agent': 'Firefox' }))
})

describe('GUIC-689 — la consultation survit à la fin de la portée de requête', () => {
  it('enregistre même quand `headers()` est devenu inaccessible', async () => {
    const differe = await differerVuePage({ typeEntite: 'ressource', entiteId: 'r1' })

    fermerLaPortee() // la réponse est partie ; c'est ici qu'after() s'exécute
    await differe()

    expect(mockTrackConsultation).toHaveBeenCalledTimes(1)
    expect(mockTrackConsultation).toHaveBeenCalledWith(
      expect.objectContaining({ typeEntite: 'ressource', entiteId: 'r1', ip: '41.82.13.7' }),
    )
  })

  it('capture IP et user-agent au moment de la requête, pas au moment de l\'écriture', async () => {
    const differe = await differerVuePage({ typeEntite: 'evenement', entiteId: 'e1' })
    expect(mockHeaders).toHaveBeenCalled() // lecture faite AVANT

    const appelsAvant = mockHeaders.mock.calls.length
    fermerLaPortee()
    await differe()

    // L'exécution différée ne relit pas la requête.
    expect(mockHeaders.mock.calls.length).toBe(appelsAvant)
    expect(mockTrackConsultation).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: 'Firefox' }),
    )
  })

  it('reste fail-soft : des headers illisibles ne cassent pas la page', async () => {
    mockHeaders.mockRejectedValue(new Error('headers indisponibles'))
    const differe = await differerVuePage({ typeEntite: 'centre', entiteId: 'c1' })
    await expect(differe()).resolves.toBeUndefined()
  })
})
