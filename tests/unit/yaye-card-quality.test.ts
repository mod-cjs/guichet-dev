/**
 * Méta-éval Piste A — rendu structurel de TOUS les kinds de card (généralisation de
 * checkCardQuality). Une fixture POSITIVE (tous les kinds bien formés) reste verte ; une
 * fixture NÉGATIVE par kind (champ requis retiré) DOIT rougir. Ferme le trou où seul
 * `opportunites` était validé (les 4 kinds ajoutés en P1-D émettent evenements/ressources/
 * centres/notifications, désormais couverts).
 */
import { checkCardQuality } from '@/lib/ia/metrics/golden/checks'
import type { YayeBlock } from '@/lib/ia/blocks'

const valid: Record<string, YayeBlock> = {
  opportunites: { kind: 'opportunites', items: [{ id: 'o1', slug: 's', titre: 'Stage', type: 'Stage', organisation: null, region: null, deadline: null }] },
  evenements: { kind: 'evenements', items: [{ id: 'e1', titre: 'Forum emploi', type: 'Forum', dateDebut: '2026-08-01T09:00:00Z', lieu: 'Dakar', estGratuit: true }] },
  ressources: { kind: 'ressources', items: [{ id: 'r1', titre: 'Guide CV', type: 'Guide', theme: 'emploi' }] },
  centres: { kind: 'centres', items: [{ id: 'c1', slug: 'pikine', nom: 'Centre Pikine', ville: 'Pikine', region: 'Dakar', adresse: 'Rue 10', telephone: null, services: [] }] },
  notifications: { kind: 'notifications', items: [{ id: 'n1', type: 'Deadline', titre: 'Rappel', contenu: 'Ta candidature expire demain', lu: false }] },
  quick_replies: { kind: 'quick_replies', replies: [{ label: 'Voir', value: 'voir les offres' }] },
  action: { kind: 'action', title: 'Récapitulatif', actions: [{ icon: 'document', label: 'CV joint' }] },
  escalade: { kind: 'escalade', reference: 'YAYE-AB12', title: 'Transmis', message: 'Un conseiller du CJS va te recontacter.' },
  carte_cjs: { kind: 'carte_cjs', cjsUid: 'u1', user: { prenom: 'Awa', nom: 'Diop', matricule: 'M-1', membreDepuis: '2025' } },
}

// Variante mal formée par kind (champ requis retiré / vidé).
const broken: Record<string, YayeBlock> = {
  opportunites: { kind: 'opportunites', items: [{ id: 'o2', slug: '', titre: '', type: 'Stage', organisation: null, region: null, deadline: null }] },
  evenements: { kind: 'evenements', items: [{ id: 'e2', titre: 'Sans lieu', type: 'Forum', dateDebut: '2026-08-01T09:00:00Z', lieu: '', estGratuit: true }] },
  ressources: { kind: 'ressources', items: [{ id: 'r2', titre: 'Sans thème', type: 'Guide', theme: '' }] },
  centres: { kind: 'centres', items: [{ id: 'c2', slug: null, nom: 'Sans adresse', ville: null, region: null, adresse: '', telephone: null, services: [] }] },
  notifications: { kind: 'notifications', items: [{ id: 'n2', type: 'System', titre: 'Vide', contenu: '', lu: false }] },
  quick_replies: { kind: 'quick_replies', replies: [{ label: 'Sans value', value: '' }] },
  action: { kind: 'action', actions: [], buttons: [] },
  escalade: { kind: 'escalade', reference: '', title: 'Transmis', message: 'msg' },
  carte_cjs: { kind: 'carte_cjs', cjsUid: '', user: { prenom: 'Awa', nom: 'Diop', matricule: 'M-1', membreDepuis: '2025' } },
}

describe('checkCardQuality — tous les kinds', () => {
  test('POSITIF : tous les kinds bien formés + texte en tête → ok', () => {
    const r = checkCardQuality([{ kind: 'text', text: 'Voici pour toi' }, ...Object.values(valid)])
    expect(r.ok).toBe(true)
    expect(r.malformed).toEqual([])
    expect(r.hasLeadingText).toBe(true)
    expect(r.oppCount).toBe(1)
    expect(r.cardCount).toBe(Object.keys(valid).length)
  })

  for (const kind of Object.keys(broken)) {
    test(`NÉGATIF : ${kind} mal formé → cassé`, () => {
      const r = checkCardQuality([broken[kind]])
      expect(r.ok).toBe(false)
      expect(r.malformed.length).toBeGreaterThan(0)
    })
  }

  test('rétro-compat : détecte l’item opportunites cassé par son id', () => {
    const r = checkCardQuality([valid.opportunites, broken.opportunites])
    expect(r.ok).toBe(false)
    expect(r.malformed).toContain('o2')
  })

  test('texte seul (pas de card) → ok, cardCount=0', () => {
    const r = checkCardQuality([{ kind: 'text', text: 'salut' }])
    expect(r.ok).toBe(true)
    expect(r.cardCount).toBe(0)
  })
})
