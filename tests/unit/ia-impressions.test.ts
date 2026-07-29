/**
 * @jest-environment node
 *
 * GUIC-688 — Impressions émises quand Yaye affiche un bloc de cards.
 *
 * Afficher 5 offres, ce n'est pas 5 consultations : c'est 5 IMPRESSIONS.
 * Les deux doivent rester séparées, sinon le taux de conversion « vu → ouvert »
 * n'a plus de sens.
 */

import { entiteDepuisBlock, canalDepuisAgent, trackBlockImpressions } from '@/lib/ia/impressions'
import type { YayeBlock } from '@/lib/ia/blocks'

const mockTrackImpressions = jest.fn()
jest.mock('@/lib/analytics/consultations', () => {
  const reel = jest.requireActual('@/lib/analytics/consultations')
  return { ...reel, trackImpressions: (...args: unknown[]) => mockTrackImpressions(...args) }
})

/** Bloc d'opportunités minimal — seuls les `id` comptent pour le tracking. */
function blocOpportunites(ids: string[]): YayeBlock {
  return {
    kind:  'opportunites',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: ids.map((id) => ({ id, slug: `slug-${id}`, titre: `Offre ${id}` })) as any,
  }
}

describe('GUIC-688 — impressions des blocs Yaye', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('entiteDepuisBlock', () => {
    it('mappe les quatre familles de cards traçables', () => {
      expect(entiteDepuisBlock('opportunites')).toBe('opportunite')
      expect(entiteDepuisBlock('evenements')).toBe('evenement')
      expect(entiteDepuisBlock('ressources')).toBe('ressource')
      expect(entiteDepuisBlock('centres')).toBe('centre')
    })

    it('ignore les blocs qui ne présentent pas de contenu du catalogue', () => {
      expect(entiteDepuisBlock('text')).toBeNull()
      expect(entiteDepuisBlock('quick_replies')).toBeNull()
      expect(entiteDepuisBlock('notifications')).toBeNull()
    })
  })

  describe('canalDepuisAgent', () => {
    it('distingue le chat web de WhatsApp', () => {
      expect(canalDepuisAgent('web')).toBe('ia_web')
      expect(canalDepuisAgent('whatsapp')).toBe('whatsapp')
    })
  })

  describe('trackBlockImpressions', () => {
    it('émet une impression par card, sur le canal de la conversation', async () => {
      await trackBlockImpressions(blocOpportunites(['o1', 'o2', 'o3']), {
        canal:     'web',
        cjsUid:    'uid-1',
        sessionId: 'sess-1',
      })

      expect(mockTrackImpressions).toHaveBeenCalledWith(
        ['o1', 'o2', 'o3'],
        expect.objectContaining({
          typeEntite: 'opportunite',
          canal:      'ia_web',
          cjsUid:     'uid-1',
          sessionId:  'sess-1',
        }),
      )
    })

    it('marque l’origine reco quand les cards viennent d’une recommandation', async () => {
      await trackBlockImpressions(blocOpportunites(['o1']), {
        canal:     'web',
        cjsUid:    'uid-1',
        sessionId: 'sess-1',
        outil:     'get_recommendations',
      })

      expect(mockTrackImpressions).toHaveBeenCalledWith(
        ['o1'],
        expect.objectContaining({ origine: 'reco_ia' }),
      )
    })

    // GUIC-688 — les livres n'ont pas de bloc dédié : l'outil bibliothèque les
    // surface via un bloc `action` dont les boutons portent les identifiants.
    it('émet des impressions de livres depuis un bloc action de la bibliothèque', async () => {
      await trackBlockImpressions(
        {
          kind:    'action',
          title:   '2 livres disponibles',
          actions: [],
          buttons: [
            { label: 'Petit Prince', href: '/jeune/bibliotheque/l1?src=ia' },
            { label: 'Ségou',        href: '/jeune/bibliotheque/l2?src=ia' },
          ],
        },
        { canal: 'web', cjsUid: 'uid-1', sessionId: 'sess-1' },
      )

      expect(mockTrackImpressions).toHaveBeenCalledWith(
        ['l1', 'l2'],
        expect.objectContaining({ typeEntite: 'livre', canal: 'ia_web' }),
      )
    })

    it('ignore un bloc action sans lien de catalogue', async () => {
      await trackBlockImpressions(
        { kind: 'action', title: 'Rappel', actions: [], buttons: [{ label: 'Mon profil', href: '/jeune/profil' }] },
        { canal: 'web', cjsUid: 'uid-1', sessionId: 'sess-1' },
      )
      expect(mockTrackImpressions).not.toHaveBeenCalled()
    })

    it('n’émet rien pour un bloc sans contenu de catalogue', async () => {
      await trackBlockImpressions({ kind: 'text', text: 'bonjour' }, { canal: 'web', cjsUid: 'uid-1', sessionId: 's' })
      expect(mockTrackImpressions).not.toHaveBeenCalled()
    })

    it('ne casse pas la réponse de l’agent si le tracking échoue', async () => {
      mockTrackImpressions.mockRejectedValue(new Error('DB down'))

      await expect(
        trackBlockImpressions(blocOpportunites(['o1']), { canal: 'web', cjsUid: 'uid-1', sessionId: 's' }),
      ).resolves.toBeUndefined()
    })
  })
})
