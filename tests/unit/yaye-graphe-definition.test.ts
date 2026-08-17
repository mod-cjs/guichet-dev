/**
 * @jest-environment node
 *
 * GUIC-706 — l'intention masquée disparaît de ce qu'on envoie au modèle.
 *
 * Refuser à l'exécution ne suffit pas, pour la même raison qu'au niveau 2 : l'agent tolère
 * les appels émis en texte brut, et le modèle continuerait de tenter une intention que sa
 * description lui présente encore — en annonçant au passage une fonctionnalité qu'on cache.
 *
 * PROPRIÉTÉ DE SÛRETÉ, avant toute autre : rien de masqué, la définition doit être
 * IDENTIQUE à celle d'aujourd'hui. C'est une définition réglée, et une dérive silencieuse
 * sur l'énumération d'intentions dégraderait le routage sans rien signaler.
 */
import { filtrerDefinitionGraphe, INTENTIONS_PARAM } from '@/lib/ia/graphe-definition'
import { TOOLS, type ToolDefinition } from '@/lib/ia/tools'
import { FLAG_PAR_INTENTION } from '@/lib/flags/yaye'

const ORIGINALE = TOOLS.query_knowledge_graph.definition
const RIEN = new Set<string>()

type Props = Record<string, { enum?: string[]; description?: string }>
const propsDe = (d: ToolDefinition | null): Props =>
  ((d?.function.parameters as { properties?: Props } | undefined)?.properties ?? {}) as Props

/** Les intentions réellement exposées par la définition. */
const enumDe = (d: ToolDefinition | null) => propsDe(d).intent?.enum ?? []
const params = (d: ToolDefinition | null) => Object.keys(propsDe(d))

describe('non-régression', () => {
  it('rend la définition à l’identique quand rien n’est masqué', () => {
    expect(filtrerDefinitionGraphe(ORIGINALE, RIEN)).toEqual(ORIGINALE)
  })

  it('ne mute pas la définition d’origine', () => {
    // Le registre est un module partagé : une mutation contaminerait toutes les
    // conversations suivantes, y compris celles d'un administrateur.
    const avant = JSON.stringify(ORIGINALE)
    filtrerDefinitionGraphe(ORIGINALE, new Set(['livre_disponible']))
    expect(JSON.stringify(ORIGINALE)).toBe(avant)
  })

  it('n’associe les paramètres qu’à des intentions réelles', () => {
    for (const intentions of Object.values(INTENTIONS_PARAM)) {
      for (const i of intentions) expect(FLAG_PAR_INTENTION[i]).toBeDefined()
    }
  })

  it('couvre tous les paramètres de la définition sauf l’intention elle-même', () => {
    for (const p of params(ORIGINALE)) {
      if (p !== 'intent') expect(INTENTIONS_PARAM[p]).toBeDefined()
    }
  })
})

describe('retrait d’une intention', () => {
  const SANS_LIVRE = new Set(['livre_disponible'])

  it('la retire de l’énumération', () => {
    expect(enumDe(filtrerDefinitionGraphe(ORIGINALE, SANS_LIVRE))).not.toContain('livre_disponible')
  })

  it('ne la nomme plus nulle part', () => {
    // Y compris dans la description des paramètres, qui citait l'intention entre
    // parenthèses.
    const d = filtrerDefinitionGraphe(ORIGINALE, SANS_LIVRE)
    expect(JSON.stringify(d)).not.toContain('livre_disponible')
  })

  it('retire le paramètre qui ne servait qu’elle', () => {
    // `theme` ne sert qu'à la recherche de livres : le laisser décrirait en creux ce qu'on
    // vient de retirer.
    expect(params(filtrerDefinitionGraphe(ORIGINALE, SANS_LIVRE))).not.toContain('theme')
  })

  it('conserve un paramètre partagé avec une intention ouverte', () => {
    // `q` sert aussi la recherche d'offres.
    expect(params(filtrerDefinitionGraphe(ORIGINALE, SANS_LIVRE))).toContain('q')
  })

  it('laisse les autres intentions intactes', () => {
    const d = filtrerDefinitionGraphe(ORIGINALE, SANS_LIVRE)
    for (const i of enumDe(ORIGINALE)) {
      if (i !== 'livre_disponible') expect(enumDe(d)).toContain(i)
    }
  })

  it('laisse une description cohérente', () => {
    const desc = filtrerDefinitionGraphe(ORIGINALE, SANS_LIVRE)?.function.description ?? ''
    expect(desc).not.toMatch(/\n\s*\n/)
    expect(desc).not.toMatch(/ {2,}/)
    expect(desc.trim()).toBe(desc.trim().trim())
  })
})

describe('retrait de plusieurs intentions', () => {
  const SANS_M3 = new Set(['recherche', 'eligibilite', 'parcours', 'apercu_marche', 'ecart_competences'])

  it('retire toutes celles du module fermé', () => {
    const e = enumDe(filtrerDefinitionGraphe(ORIGINALE, SANS_M3))
    for (const i of SANS_M3) expect(e).not.toContain(i)
  })

  it('retire les paramètres devenus sans emploi', () => {
    const p = params(filtrerDefinitionGraphe(ORIGINALE, SANS_M3))
    for (const sansEmploi of ['domaine', 'region', 'type']) expect(p).not.toContain(sansEmploi)
  })

  it('garde ce qui sert encore une intention ouverte', () => {
    // `opportuniteId` sert aussi `ressources_competences`, restée ouverte.
    expect(params(filtrerDefinitionGraphe(ORIGINALE, SANS_M3))).toContain('opportuniteId')
  })
})

describe('toutes les intentions masquées', () => {
  const TOUTES = new Set(Object.keys(FLAG_PAR_INTENTION))

  it('rend null — l’outil n’a plus rien à offrir', () => {
    // Le proposer avec une énumération vide inviterait le modèle à l'appeler pour rien, et
    // chaque appel coûte un tour de boucle.
    expect(filtrerDefinitionGraphe(ORIGINALE, TOUTES)).toBeNull()
  })
})
