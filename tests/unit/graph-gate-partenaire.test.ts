/**
 * GUIC-706 (revue) — gate de visibilité jeune dans le graphe Yaye (Neo4j).
 * Neo4j n'est pas lançable ici → on vérifie (1) le mapping de projection qui porte
 * `orgSuspendue` sur le nœud Opportunite, (2) que les templates Cypher qui renvoient des
 * opportunités au bénéficiaire excluent bien les partenaires suspendus.
 */
import { oppNodeProps } from '@/lib/ia/graph/projection/project'
import {
  SEARCH_OPPORTUNITES,
  FORMATIONS_FOR_SKILLS,
  ELIGIBLE_OPPORTUNITES,
  COLLABORATIVE_RECO,
  MULTI_ENTITY_PATH,
} from '@/lib/ia/graph/cypher-templates'

describe('GUIC-706 — projection : orgSuspendue sur le nœud Opportunite', () => {
  const base = { id: 'o1', slug: 's', titre: 't', domaine: 'Autre', region: 'Dakar', statut: 'publiee', deadline: null, remuneration: null, niveauEtudeMin: null, organisationLibelle: 'X', vues: 0 }

  it('org suspendue → orgSuspendue = true', () => {
    expect(oppNodeProps({ ...base, org: { statut: 'suspendue' } }).orgSuspendue).toBe(true)
  })
  it('org active → orgSuspendue = false', () => {
    expect(oppNodeProps({ ...base, org: { statut: 'active' } }).orgSuspendue).toBe(false)
  })
  it('sans org → orgSuspendue = false, et pas de champ org résiduel', () => {
    const n = oppNodeProps({ ...base, org: null })
    expect(n.orgSuspendue).toBe(false)
    expect('org' in n).toBe(false) // aplati : Neo4j ne stocke pas de map imbriquée
  })
})

describe('GUIC-706 — templates Cypher excluent les partenaires suspendus', () => {
  it.each([
    ['SEARCH_OPPORTUNITES', SEARCH_OPPORTUNITES, 'o'],
    ['FORMATIONS_FOR_SKILLS', FORMATIONS_FOR_SKILLS, 'o'],
    ['ELIGIBLE_OPPORTUNITES', ELIGIBLE_OPPORTUNITES, 'o'],
    ['COLLABORATIVE_RECO', COLLABORATIVE_RECO, 'reco'],
    ['MULTI_ENTITY_PATH', MULTI_ENTITY_PATH, 'o'],
  ])('%s garde coalesce(%s.orgSuspendue,false)=false', (_name, tpl, alias) => {
    expect(tpl.replace(/\s+/g, ' ')).toContain(`coalesce(${alias}.orgSuspendue, false) = false`)
  })
})
