/**
 * @jest-environment jsdom
 *
 * Tests du module client `src/lib/onboarding-draft.ts` (GUIC-181).
 * Le storage est maintenant côté serveur via /api/onboarding/draft : on
 * mocke `fetch` global et on vérifie le cache + le wire format.
 */
import {
  readDraft,
  patchDraft,
  clearDraft,
  __resetDraftCache,
} from '@/lib/onboarding-draft'

function jsonResponse(body: unknown, status = 200): { ok: boolean; status: number; json: () => Promise<unknown> } {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

beforeEach(() => {
  __resetDraftCache()
  ;(global.fetch as unknown) = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('onboarding-draft client (serveur Prisma)', () => {
  it('readDraft : retourne un draft vide quand l\'API renvoie data=null', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: null }))
    const d = await readDraft()
    expect(d).toEqual({ objectifs: [] })
    expect(global.fetch).toHaveBeenCalledWith('/api/onboarding/draft', expect.objectContaining({ method: 'GET' }))
  })

  it('readDraft : normalise une réponse non vide', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({
        data: {
          objectifs: ['emploi', 'projet'],
          telephone: null, prenom: 'Awa', nom: 'Diop',
          dateNaissance: '2000-05-01', genre: 'F',
          region: 'Dakar', commune: null,
          updatedAt: new Date().toISOString(),
        },
      }),
    )
    const d = await readDraft()
    expect(d.prenom).toBe('Awa')
    expect(d.objectifs).toEqual(['emploi', 'projet'])
    expect(d.dateNaissance).toBe('2000-05-01')
  })

  it('readDraft : normalise situationHandicap/zoneHabitation valides (GUIC-660)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({
        data: {
          objectifs: [], telephone: null, prenom: null, nom: null,
          dateNaissance: null, genre: null, region: null, commune: null,
          situationHandicap: 'moteur', zoneHabitation: 'rural',
          updatedAt: new Date().toISOString(),
        },
      }),
    )
    const d = await readDraft()
    expect(d.situationHandicap).toBe('moteur')
    expect(d.zoneHabitation).toBe('rural')
  })

  it('readDraft : ignore des valeurs inclusion hors enum (GUIC-660)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({
        data: {
          objectifs: [], telephone: null, prenom: null, nom: null,
          dateNaissance: null, genre: null, region: null, commune: null,
          situationHandicap: 'xxx', zoneHabitation: 'periurbain',
          updatedAt: new Date().toISOString(),
        },
      }),
    )
    const d = await readDraft()
    expect(d.situationHandicap).toBeUndefined()
    expect(d.zoneHabitation).toBeUndefined()
  })

  it('readDraft : cache en mémoire — pas de double fetch', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: null }))
    await readDraft()
    await readDraft()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('patchDraft : envoie un PATCH JSON et met à jour le cache', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({
        data: {
          objectifs: ['emploi'],
          telephone: null, prenom: 'Awa', nom: null,
          dateNaissance: null, genre: null, region: null, commune: null,
          updatedAt: new Date().toISOString(),
        },
      }),
    )
    const d = await patchDraft({ prenom: 'Awa', objectifs: ['emploi'] })
    expect(d.prenom).toBe('Awa')
    expect(d.objectifs).toEqual(['emploi'])
    const call = (global.fetch as jest.Mock).mock.calls[0]
    expect(call[1].method).toBe('PATCH')
    expect(JSON.parse(call[1].body)).toEqual({ prenom: 'Awa', objectifs: ['emploi'] })

    // cache hit — pas de nouveau fetch
    const again = await readDraft()
    expect(again.prenom).toBe('Awa')
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('clearDraft : appelle DELETE et invalide le cache', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: null }, 204))
      .mockResolvedValueOnce(jsonResponse({ data: null }))

    await clearDraft()
    const after = await readDraft()
    expect(after).toEqual({ objectifs: [] })
    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE')
  })

  it('readDraft : tolère une erreur réseau (retourne draft vide)', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'))
    const d = await readDraft()
    expect(d).toEqual({ objectifs: [] })
  })

  it('readDraft : objectifs invalide → tableau vide (jamais undefined)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({
        data: {
          objectifs: 'pas-un-tableau',
          telephone: null, prenom: 'X', nom: null, dateNaissance: null,
          genre: null, region: null, commune: null,
          updatedAt: new Date().toISOString(),
        },
      }),
    )
    const d = await readDraft()
    expect(d.objectifs).toEqual([])
  })
})
