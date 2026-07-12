/**
 * @jest-environment node
 *
 * Garde-fou anti-méta de la réponse de Yaye (repairMetaReply). Détecteur PUR, aucun mock.
 */
import { detectMetaLeakage, repairMetaReply } from '@/lib/ia/reply-guard'
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
