/**
 * @jest-environment node
 *
 * GUIC-688 — Tests de l'adaptateur serveur des consultations (pages RSC).
 *
 * Anti-régression cible :
 * - Extraction de l'IP : `x-real-ip` puis `x-forwarded-for`, repli explicite
 * - `?src=` → canal (le clic venu d'un lien WhatsApp ne doit pas être compté
 *   comme du trafic web organique)
 * - `?from=` → origine (une vue issue d'une reco doit rester identifiable)
 * - Fail-soft : des headers illisibles ne cassent jamais le rendu
 */

import { trackVuePage, ipDepuisHeaders, origineFromParam } from '@/lib/analytics/consultation-server'

const mockHeaders = jest.fn()
jest.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}))

const mockTrackConsultation = jest.fn()
jest.mock('@/lib/analytics/consultations', () => {
  const reel = jest.requireActual('@/lib/analytics/consultations')
  return { ...reel, trackConsultation: (...args: unknown[]) => mockTrackConsultation(...args) }
})

/** Construit un faux `headers()` Next à partir d'une map simple. */
function headersAvec(map: Record<string, string>) {
  return { get: (k: string) => map[k] ?? null }
}

describe('GUIC-688 — adaptateur serveur consultations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHeaders.mockResolvedValue(headersAvec({}))
  })

  describe('ipDepuisHeaders', () => {
    it('préfère `x-real-ip`', async () => {
      mockHeaders.mockResolvedValue(headersAvec({ 'x-real-ip': '41.82.13.7', 'x-forwarded-for': '10.0.0.1' }))
      expect(await ipDepuisHeaders()).toBe('41.82.13.7')
    })

    it('retombe sur la première adresse de `x-forwarded-for`', async () => {
      mockHeaders.mockResolvedValue(headersAvec({ 'x-forwarded-for': '41.82.13.7, 10.0.0.1' }))
      expect(await ipDepuisHeaders()).toBe('41.82.13.7')
    })

    it('retombe sur un repli explicite si rien n’est exploitable', async () => {
      expect(await ipDepuisHeaders()).toBe('no-ip')
    })
  })

  describe('origineFromParam', () => {
    it('mappe `reco` sur l’origine recommandation', () => {
      expect(origineFromParam('reco')).toBe('reco_ia')
    })

    it('accepte les origines connues telles quelles', () => {
      expect(origineFromParam('recherche')).toBe('recherche')
      expect(origineFromParam('favoris')).toBe('favoris')
      expect(origineFromParam('notification')).toBe('notification')
    })

    it('retombe sur `direct` pour absent ou inconnu', () => {
      expect(origineFromParam(undefined)).toBe('direct')
      expect(origineFromParam('bidon')).toBe('direct')
    })
  })

  describe('trackVuePage', () => {
    it('enregistre une consultation web avec l’IP et le cjsUid', async () => {
      mockHeaders.mockResolvedValue(headersAvec({ 'x-real-ip': '41.82.13.7' }))

      await trackVuePage({ typeEntite: 'evenement', entiteId: 'ev-1', cjsUid: 'uid-1' })

      expect(mockTrackConsultation).toHaveBeenCalledWith({
        typeEntite: 'evenement',
        entiteId:   'ev-1',
        typeEvent:  'consultation',
        canal:      'web',
        cjsUid:     'uid-1',
        ip:         '41.82.13.7',
        origine:    'direct',
      })
    })

    it('attribue le clic au canal WhatsApp quand le lien porte src=wa', async () => {
      await trackVuePage({ typeEntite: 'opportunite', entiteId: 'opp-1', src: 'wa' })

      expect(mockTrackConsultation).toHaveBeenCalledWith(
        expect.objectContaining({ canal: 'whatsapp' }),
      )
    })

    it('attribue le clic au chat IA quand le lien porte src=ia', async () => {
      await trackVuePage({ typeEntite: 'opportunite', entiteId: 'opp-1', src: 'ia', from: 'reco' })

      expect(mockTrackConsultation).toHaveBeenCalledWith(
        expect.objectContaining({ canal: 'ia_web', origine: 'reco_ia' }),
      )
    })

    it('accepte un paramètre d’URL répété (tableau) sans casser', async () => {
      await trackVuePage({ typeEntite: 'centre', entiteId: 'c-1', src: ['wa', 'ia'] })

      expect(mockTrackConsultation).toHaveBeenCalledWith(
        expect.objectContaining({ canal: 'whatsapp' }),
      )
    })

    it('n’envoie pas de cjsUid pour un visiteur anonyme', async () => {
      await trackVuePage({ typeEntite: 'ressource', entiteId: 'r-1', cjsUid: null })

      const arg = mockTrackConsultation.mock.calls[0][0] as Record<string, unknown>
      expect(arg.cjsUid).toBeUndefined()
    })

    it('ne casse pas le rendu si les headers sont illisibles', async () => {
      mockHeaders.mockRejectedValue(new Error('headers indisponibles'))

      await expect(
        trackVuePage({ typeEntite: 'livre', entiteId: 'l-1' }),
      ).resolves.toBeUndefined()
    })
  })
})
