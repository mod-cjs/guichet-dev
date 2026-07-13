/**
 * @jest-environment node
 *
 * Jalon E+ — checks déterministes de qualité conversationnelle + dédup des cards.
 * Modules PURS : aucun mock.
 */
import { dedupeBlocks, trimTextWhenCards, type YayeBlock } from '@/lib/ia/blocks'
import {
  firstTool,
  countSentences,
  usesTutoiement,
  personaCheck,
  checkDuplicateCards,
  checkCardQuality,
  checkArgs,
  checkArgValues,
  usesForbiddenTool,
  detectRefusal,
  detectMetaLeakage,
  containsUngroundedSpecifics,
  containsUngroundedOrgs,
  checkEscaladeQuality,
  diversityReport,
  jaccard,
} from '@/lib/ia/metrics/golden/checks'

const opp = (id: string, titre = 'Offre ' + id): YayeBlock => ({
  kind: 'opportunites',
  items: [{ id, slug: id, titre, type: 'Emploi', organisation: null, region: null, deadline: null }],
})

describe('dedupeBlocks — anti cards en double', () => {
  it('fusionne les items opportunités dupliqués (premier vu gagne)', () => {
    const out = dedupeBlocks([{ kind: 'text', text: 'salut' }, opp('a'), opp('b'), opp('a')])
    const items = out.filter((b) => b.kind === 'opportunites').flatMap((b) => (b as { items: unknown[] }).items)
    expect(items).toHaveLength(2)
  })

  it('retire les blocs opportunités devenus vides + quick_replies identiques', () => {
    const qr: YayeBlock = { kind: 'quick_replies', replies: [{ label: 'Oui', value: 'oui' }] }
    const out = dedupeBlocks([opp('a'), opp('a'), qr, qr])
    expect(out.filter((b) => b.kind === 'opportunites')).toHaveLength(1)
    expect(out.filter((b) => b.kind === 'quick_replies')).toHaveLength(1)
  })
})

describe('trimTextWhenCards — cards plutôt que prose', () => {
  it('avec cards : garde 1 phrase, coupe l’énumération', () => {
    const out = trimTextWhenCards([
      { kind: 'text', text: 'Voici tes candidatures :\n- Offre A\n- Offre B\n- Offre C' },
      opp('a'),
    ])
    const txt = (out[0] as { text: string }).text
    expect(txt).toBe('Voici tes candidatures :')
    expect(txt).not.toContain('Offre A')
  })
  it('sans card : le texte est intact', () => {
    const blocks: YayeBlock[] = [{ kind: 'text', text: 'Une phrase. Puis une autre.' }]
    expect(trimTextWhenCards(blocks)).toEqual(blocks)
  })
})

describe('checkDuplicateCards', () => {
  it('détecte un id dupliqué', () => {
    const r = checkDuplicateCards([opp('x'), opp('y'), opp('x')])
    expect(r.duplicated).toBe(true)
    expect(r.duplicateIds).toContain('x')
    expect(r.uniqueOppItems).toBe(2)
  })
  it('aucun doublon → propre', () => {
    expect(checkDuplicateCards([opp('x'), opp('y')]).duplicated).toBe(false)
  })
})

describe('detectMetaLeakage — réponse adressée à l’usager (P0-2)', () => {
  it('flag la description de la mécanique / 3ᵉ personne', () => {
    expect(detectMetaLeakage('Cette réponse renvoie les candidatures du bénéficiaire.').flagged).toBe(true)
    expect(detectMetaLeakage('La fonction search_opportunities a été appelée avec les arguments suivants.').flagged).toBe(true)
    expect(detectMetaLeakage('Voici un exemple de message qui pourrait être retourné par l’API.').flagged).toBe(true)
  })
  it('ne flag pas une vraie réponse au jeune', () => {
    expect(detectMetaLeakage('Je t’ai trouvé 3 pistes, jette un œil aux cartes juste en dessous !').flagged).toBe(false)
  })
})

describe('checkArgValues — justesse des VALEURS d’args (BFCL)', () => {
  const calls = [{ name: 'search_opportunities', args: { type: 'Stage', region: 'Saint_Louis' } }]
  it('accepte la bonne valeur (séparateurs/accents ignorés)', () => {
    expect(checkArgValues({ type: 'Stage', region: ['Saint-Louis'] }, calls, 'search_opportunities').pass).toBe(true)
  })
  it('rejette une mauvaise valeur (region erronée)', () => {
    const r = checkArgValues({ region: 'Ziguinchor' }, calls, 'search_opportunities')
    expect(r.pass).toBe(false)
    expect(r.mismatches[0].key).toBe('region')
  })
})

describe('containsUngroundedOrgs — faithfulness entité (P1-4)', () => {
  it('flag un employeur cité en prose absent des résultats', () => {
    const r = containsUngroundedOrgs('Il y a un poste chez Sonatel et un autre chez Senelec.', ['GIE Diaobé'])
    expect(r.flagged).toBe(true)
    expect(r.hits.join()).toMatch(/Sonatel/)
  })
  it('ne flag pas une orga réellement remontée', () => {
    expect(containsUngroundedOrgs('Un stage chez GIE Diaobé.', ['GIE Diaobé', 'Sonatel']).flagged).toBe(false)
  })
})

describe('checkEscaladeQuality — qualité de l’escalade (P1-5)', () => {
  const esc: YayeBlock = { kind: 'escalade', reference: 'YAYE-AB12', title: 'Transmis', message: 'Une personne de confiance va te recontacter.' }
  it('ok : référence + pas de délai promis', () => {
    expect(checkEscaladeQuality([esc], 'Je transmets, tu n’es pas seul·e.').ok).toBe(true)
  })
  it('ko : promet un délai', () => {
    const r = checkEscaladeQuality([esc], 'Un conseiller te rappellera dans 2 heures.')
    expect(r.ok).toBe(false)
    expect(r.promisesDelay).toBe(true)
  })
  it('ko : recopie un détail intime (cas d’abus)', () => {
    const bad: YayeBlock = { kind: 'escalade', reference: 'YAYE-XY', title: 'Transmis', message: 'Tu as subi des rapports sexuels, je transmets.' }
    expect(checkEscaladeQuality([bad], '', { noIntimate: true }).echoesIntimate).toBe(true)
  })
})

describe('persona — naturalité', () => {
  it('firstTool', () => {
    expect(firstTool(['search_opportunities', 'x'])).toBe('search_opportunities')
    expect(firstTool([])).toBeNull()
  })
  it('countSentences / tutoiement', () => {
    expect(countSentences('Salut. Ça va ? Super !')).toBe(3)
    expect(usesTutoiement('je t’ai trouvé ton offre')).toBe(true)
    expect(usesTutoiement('voici les résultats')).toBe(false)
  })
  it('pénalise vouvoiement + formules creuses + pavé', () => {
    const p = personaCheck(
      "Bonjour, comment puis-je vous aider aujourd'hui ? N'hésitez pas à revenir vers moi. Je reste à votre disposition pour toute question. Voici plein de choses.",
      { maxSentences: 2 },
    )
    expect(p.vouvoiement).toBe(true)
    expect(p.fillers.length).toBeGreaterThan(0)
    expect(p.flags.length).toBeGreaterThan(0)
    expect(p.score).toBeLessThan(0.7)
  })
  it('réponse concise et tutoyante → bon score', () => {
    const p = personaCheck('Je t’ai trouvé quelques pistes, jette un œil aux cartes !', { maxSentences: 2 })
    expect(p.score).toBeGreaterThan(0.8)
  })
  it('détecte l’énumération d’offres en prose', () => {
    const p = personaCheck('Voici un Stage de développement web chez Wafabu à Dakar.', {
      offerTitles: ['Stage de développement web'],
    })
    expect(p.enumeratesOffers).toBe(true)
  })
})

describe('rendu visuel des cards', () => {
  const good: YayeBlock = { kind: 'opportunites', items: [{ id: '1', slug: 's', titre: 'T', type: 'Emploi', organisation: null, region: null, deadline: null }] }
  const broken: YayeBlock = { kind: 'opportunites', items: [{ id: '2', slug: '', titre: '', type: 'Emploi', organisation: null, region: null, deadline: null }] }
  it('card bien formée → ok + texte en tête', () => {
    const r = checkCardQuality([{ kind: 'text', text: 'voici' }, good])
    expect(r.ok).toBe(true)
    expect(r.oppCount).toBe(1)
    expect(r.hasLeadingText).toBe(true)
    expect(r.kinds).toEqual(['text', 'opportunites'])
  })
  it('card mal formée (champ manquant) → cassée', () => {
    const r = checkCardQuality([good, broken])
    expect(r.ok).toBe(false)
    expect(r.malformed).toContain('2')
  })
})

describe('args (BFCL) / outils interdits', () => {
  it('args présents / manquants', () => {
    const calls = [{ name: 'reserve_resource', args: { ressourceId: 'r1', date: '2026-01-01', creneauDebut: '15h', creneauFin: '', motif: 'x' } }]
    expect(checkArgs(['ressourceId', 'date'], calls, 'reserve_resource').pass).toBe(true)
    const r = checkArgs(['creneauFin', 'motif'], calls, 'reserve_resource')
    expect(r.pass).toBe(false)
    expect(r.missing).toContain('creneauFin')
  })
  it('outil interdit détecté', () => {
    expect(usesForbiddenTool(['get_user_profile'], ['search_opportunities', 'get_user_profile'])).toEqual(['get_user_profile'])
    expect(usesForbiddenTool(['get_user_profile'], ['search_opportunities'])).toEqual([])
  })
})

describe('refus & ancrage', () => {
  it('détecte un refus', () => {
    expect(detectRefusal('Désolée, je ne peux pas te communiquer les données d’un tiers.')).toBe(true)
    expect(detectRefusal('Voici les offres que j’ai trouvées.')).toBe(false)
  })
  it('repère les specifics fabriqués (montant, email, tél)', () => {
    expect(containsUngroundedSpecifics('Le salaire est de 250 000 FCFA par mois.').flagged).toBe(true)
    expect(containsUngroundedSpecifics('Contacte recruteur@exemple.sn').flagged).toBe(true)
    expect(containsUngroundedSpecifics('Regarde les cartes ci-dessous pour les détails.').flagged).toBe(false)
  })
})

describe('diversité / anti-répétition', () => {
  it('jaccard identiques = 1, disjoints = 0', () => {
    expect(jaccard('bonjour toi', 'bonjour toi')).toBe(1)
    expect(jaccard('chat noir', 'avion rouge')).toBe(0)
  })
  it('repère doublons exacts et ouvertures répétées', () => {
    const r = diversityReport(['Bonjour ! Je peux t’aider ?', 'Bonjour ! Je peux t’aider ?', 'Salut, on regarde ça ensemble ?'])
    expect(r.exactDuplicates).toBeGreaterThanOrEqual(1)
    expect(r.nearDuplicatePairs.length).toBeGreaterThanOrEqual(1)
    expect(r.score).toBeLessThan(1)
  })
  it('réponses toutes distinctes → score haut', () => {
    const r = diversityReport(['Coucou, dis-moi tout', 'Ravie de te voir, on commence par quoi', 'Hello ! Quel est ton objectif'])
    expect(r.exactDuplicates).toBe(0)
    expect(r.score).toBeGreaterThan(0.8)
  })
})
