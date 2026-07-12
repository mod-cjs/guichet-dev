/**
 * @jest-environment node
 *
 * Garde-fou anti-méta de la réponse de Yaye (repairMetaReply). Détecteur PUR, aucun mock.
 */
import { detectMetaLeakage, repairMetaReply, stripLeadingGreeting, finalizeReply } from '@/lib/ia/reply-guard'
import type { YayeBlock } from '@/lib/ia/blocks'

const opp: YayeBlock = { kind: 'opportunites', items: [{ id: '1', slug: 's', titre: 'T', type: 'Emploi', organisation: null, region: null, deadline: null }] }
const escDanger: YayeBlock = { kind: 'escalade', reference: 'YAYE-AB', title: 'Transmis', message: 'x', danger: true }
const escSoft: YayeBlock = { kind: 'escalade', reference: 'YAYE-CD', title: 'Transmis', message: 'x' }
const action: YayeBlock = { kind: 'action', actions: [], title: 'Fait' }

const META = 'La fonction search_opportunities a été appelée avec les arguments suivants.'

describe('repairMetaReply', () => {
  it('no-op si la réponse est déjà adressée à l’usager', () => {
    const good = 'Je t’ai trouvé quelques pistes, regarde en dessous !'
    expect(repairMetaReply(good, [opp])).toBe(good)
  })
  it('méta + cards → amorce qui renvoie aux cartes (et n’est plus méta)', () => {
    const out = repairMetaReply(META, [opp])
    expect(out).not.toBe(META)
    expect(detectMetaLeakage(out).flagged).toBe(false)
    expect(out.toLowerCase()).toContain('cartes')
  })
  it('méta + escalade danger → accusé chaleureux', () => {
    const out = repairMetaReply('Cette réponse renvoie un JSON.', [escDanger])
    expect(out).toMatch(/personne de confiance/i)
    expect(detectMetaLeakage(out).flagged).toBe(false)
  })
  it('méta + escalade simple → transmission conseiller', () => {
    const out = repairMetaReply("Voici un exemple de message retourné par l'API.", [escSoft])
    expect(out).toMatch(/conseiller/i)
    expect(detectMetaLeakage(out).flagged).toBe(false)
  })
  it('méta + action → renvoie en dessous', () => {
    expect(detectMetaLeakage(repairMetaReply(META, [action])).flagged).toBe(false)
  })
  it('méta sans bloc → reprise honnête et brève', () => {
    const out = repairMetaReply("Il faudrait poser une question à l'utilisateur.", [])
    expect(detectMetaLeakage(out).flagged).toBe(false)
    expect(out.toLowerCase()).toContain('t’aider')
  })
})

describe('stripLeadingGreeting / finalizeReply — pas de re-salutation en cours de conversation', () => {
  it('retire une salutation d’ouverture et remajuscule', () => {
    expect(stripLeadingGreeting('Salut ! je t’ai trouvé un emploi.')).toBe('Je t’ai trouvé un emploi.')
    expect(stripLeadingGreeting('Bonjour Bineta, voici tes offres.')).toBe('Voici tes offres.')
    expect(stripLeadingGreeting('Ravie de te voir ! On regarde ça ?')).toBe('On regarde ça ?')
  })
  it('ne touche à rien s’il n’y a pas de salutation', () => {
    expect(stripLeadingGreeting('Je cherche pour toi.')).toBe('Je cherche pour toi.')
  })
  it('finalizeReply : garde la salutation au 1er tour, la retire ensuite', () => {
    expect(finalizeReply('Salut ! bienvenue.', [], true)).toBe('Salut ! bienvenue.')
    expect(finalizeReply('Salut ! voici ton badge.', [], false)).toBe('Voici ton badge.')
  })
  it('finalizeReply : salutation seule + cards (hors 1er tour) → amorce neutre', () => {
    expect(finalizeReply('Bonjour !', [opp], false)).toBe('Voici ce que j’ai trouvé pour toi.')
  })
})
