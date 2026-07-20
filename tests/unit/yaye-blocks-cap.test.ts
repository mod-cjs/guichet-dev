/**
 * @jest-environment node
 *
 * Plafond produit : Yaye ne partage jamais plus de MAX_OPP_ITEMS (3) opportunités.
 */
import { capOpportunites, MAX_OPP_ITEMS, type YayeBlock, type YayeOppItem } from '@/lib/ia/blocks'
import { checkCardQuality } from '@/lib/ia/metrics/golden/checks'

const opp = (id: string): YayeOppItem => ({
  id, slug: `s-${id}`, titre: `Offre ${id}`, type: 'Emploi', organisation: null, region: null, deadline: null,
})
const oppBlock = (...ids: string[]): YayeBlock => ({ kind: 'opportunites', items: ids.map(opp) })
const text: YayeBlock = { kind: 'text', text: 'Voici pour toi.' }

describe('capOpportunites — au plus 3 opportunités partagées', () => {
  it('MAX_OPP_ITEMS vaut 3', () => {
    expect(MAX_OPP_ITEMS).toBe(3)
  })

  it('tronque un bloc de 5 offres à 3', () => {
    const out = capOpportunites([text, oppBlock('1', '2', '3', '4', '5')])
    const opps = out.find(b => b.kind === 'opportunites') as Extract<YayeBlock, { kind: 'opportunites' }>
    expect(opps.items.map(i => i.id)).toEqual(['1', '2', '3'])
  })

  it('plafond GLOBAL : deux blocs (offres + reco) ne totalisent que 3', () => {
    const out = capOpportunites([oppBlock('1', '2'), text, oppBlock('3', '4', '5')])
    const total = out.filter(b => b.kind === 'opportunites').flatMap(b => (b as Extract<YayeBlock, { kind: 'opportunites' }>).items)
    expect(total.map(i => i.id)).toEqual(['1', '2', '3'])
  })

  it('un bloc entièrement au-delà du budget disparaît (pas de bloc vide)', () => {
    const out = capOpportunites([oppBlock('1', '2', '3'), oppBlock('4', '5')])
    expect(out.filter(b => b.kind === 'opportunites')).toHaveLength(1)
  })

  it('préserve les blocs non-opportunités et l’ordre', () => {
    const esc: YayeBlock = { kind: 'escalade', reference: 'YAYE-AB', title: 't', message: 'm' }
    const out = capOpportunites([text, oppBlock('1', '2', '3', '4'), esc])
    expect(out.map(b => b.kind)).toEqual(['text', 'opportunites', 'escalade'])
  })

  it('en-dessous du plafond : inchangé', () => {
    const blocks = [text, oppBlock('1', '2')]
    expect(capOpportunites(blocks)).toEqual(blocks)
  })

  it('PRÉSERVE tous les champs des items conservés (pas juste le compte) — Piste B', () => {
    const rich: YayeOppItem = {
      id: '1', slug: 'dev-web', titre: 'Développeur web', type: 'Emploi',
      typeSlug: 'emploi', typeLabel: 'Emploi', organisation: 'ACME', region: 'Dakar',
      deadline: '2026-09-01T00:00:00.000Z', note: 'plébiscitée', actionLabel: 'Postuler',
    }
    const out = capOpportunites([{ kind: 'opportunites', items: [rich, opp('2'), opp('3'), opp('4')] }])
    const kept = (out.find(b => b.kind === 'opportunites') as Extract<YayeBlock, { kind: 'opportunites' }>).items
    expect(kept[0]).toEqual(rich) // tous les champs intacts, pas seulement l'id
    // Lien Piste A : les items conservés restent des cards valides.
    expect(checkCardQuality(out).ok).toBe(true)
  })
})
