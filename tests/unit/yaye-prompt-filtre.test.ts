/**
 * @jest-environment node
 *
 * GUIC-706 — Niveau 2 : le prompt ne nomme plus un outil retiré.
 *
 * Le niveau 1 refusait l'exécution mais laissait l'agent PROPOSER une fonctionnalité
 * masquée : il l'annonçait, puis n'en tirait rien. Le prompt la lui décrivait encore à
 * dix-sept endroits, et une section entière énumère les capacités en français.
 *
 * LA PROPRIÉTÉ DE SÛRETÉ, avant toute autre : tous outils disponibles, le prompt assemblé
 * doit être IDENTIQUE à celui d'aujourd'hui. Ce prompt est le fruit d'un réglage
 * empirique — le code mesure 7/24 appels d'outil sous un prompt contre 23/24 sous
 * l'autre — et une refonte qui le modifierait ne serait pas mesurable a posteriori.
 */
import { construireSystemPrompt, LIGNES_ROUTAGE, CAPACITES } from '@/lib/ia/prompt-outils'
import { SYSTEM_PROMPT } from '@/lib/ia/agent'
import { TOOLS } from '@/lib/ia/tools'

const TOUS = new Set(Object.keys(TOOLS))
/** Rien de masqué — le cas nominal. */
const RIEN = new Set<string>()

describe('non-régression du prompt', () => {
  it('reproduit à l’identique le prompt actuel quand rien n’est retiré', () => {
    // La garantie centrale : tant qu'aucun module n'est masqué — l'immense majorité du
    // temps — l'agent reçoit exactement le texte réglé empiriquement.
    expect(construireSystemPrompt(RIEN)).toBe(SYSTEM_PROMPT)
  })

  it('n’associe les lignes de routage qu’à des outils réels', () => {
    for (const l of LIGNES_ROUTAGE) {
      for (const o of [l.primaire, ...(l.autres ?? [])].filter(Boolean)) {
        expect(TOUS.has(o as string)).toBe(true)
      }
    }
  })

  it('rattache chaque fragment de capacité à un outil réel', () => {
    for (const c of CAPACITES) expect(TOUS.has(c.outil)).toBe(true)
  })
})

describe('retrait d’un outil', () => {
  /** Seul l'agenda est masqué. */
  const SANS_AGENDA = new Set(['search_events'])

  it('retire son nom du prompt', () => {
    expect(construireSystemPrompt(SANS_AGENDA)).not.toContain('search_events')
  })

  it('retire la ligne de routage qui le décrit', () => {
    const p = construireSystemPrompt(SANS_AGENDA)
    expect(p).not.toContain('Événements / agenda')
  })

  it('retire le fragment de capacité correspondant', () => {
    // La section « présente-toi » énumère les capacités en français, hors de toute balise
    // d'outil : sans elle, Yaye continuerait d'annoncer l'agenda en se présentant.
    expect(construireSystemPrompt(SANS_AGENDA)).not.toContain('consulter l’**agenda**')
  })

  it('ne touche pas aux autres outils', () => {
    // Tous les outils ne sont pas nommés dans le prompt — certains ne servent qu'au
    // contexte. On vérifie donc que ceux qui y figuraient y figurent encore.
    const complet = construireSystemPrompt(RIEN)
    const p = construireSystemPrompt(SANS_AGENDA)
    for (const o of TOUS) {
      if (o !== 'search_events' && complet.includes(o)) expect(p).toContain(o)
    }
  })

  it('laisse un texte cohérent, sans virgule orpheline ni double espace', () => {
    // Une énumération assemblée mécaniquement produit vite « , et , » : Yaye lit ce texte
    // comme une consigne, une phrase bancale dégrade sa réponse.
    const p = construireSystemPrompt(SANS_AGENDA)
    expect(p).not.toMatch(/,\s*,/)
    expect(p).not.toMatch(/ {2,}/)
    expect(p).not.toMatch(/,\s*\./)
  })
})

describe('aucun outil masquable disponible', () => {
  // Cas extrême mais atteignable : tous les modules fermés pendant une préparation.
  const GARDES = new Set(['get_user_profile', 'get_realtime_data', 'query_knowledge_graph', 'escalate_to_advisor'])
  /** Tout le masquable est masqué ; seuls contexte et sécurité subsistent. */
  const MINIMAL = new Set([...TOUS].filter((o) => !GARDES.has(o)))

  it('produit encore un prompt exploitable', () => {
    const p = construireSystemPrompt(MINIMAL)
    expect(p.length).toBeGreaterThan(1000)
    expect(p).toContain('Yaye')
  })

  it('conserve la consigne de sécurité', () => {
    // L'escalade reste : c'est le recours humain sur signal de danger.
    expect(construireSystemPrompt(MINIMAL)).toContain('escalate_to_advisor')
  })

  it('ne nomme aucun outil retiré', () => {
    const p = construireSystemPrompt(MINIMAL)
    for (const o of MINIMAL) expect(p).not.toContain(o)
  })
})
