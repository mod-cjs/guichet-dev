/**
 * @jest-environment node
 *
 * GUIC-706 — `query_knowledge_graph` contournait le masquage.
 *
 * L'outil avait été exempté de la table de correspondance au motif qu'il « porte le
 * contexte de la conversation ». C'était une erreur de lecture : ce n'est pas un outil de
 * contexte, c'est un SECOND MOTEUR DE RÉCUPÉRATION, avec une intention par module.
 *
 * Bibliothèque masquée, `search_library` / `borrow_book` / `get_active_loans` refusaient
 * bien — mais `query_knowledge_graph` avec l'intention `livre_disponible` rendait les
 * livres disponibles, le centre ET l'emplacement précis (rayon · étagère · position). La
 * fuite ne dépend même pas de Neo4j : sans graphe configuré, l'outil interroge Prisma
 * directement.
 *
 * LA GARDE DOIT DONC ÊTRE PAR INTENTION, PAS PAR OUTIL. Masquer l'outil entier priverait
 * Yaye de tout son raisonnement sur les opportunités dès qu'une seule bibliothèque ferme.
 */
const mockGetFlags = jest.fn()
jest.mock('@/lib/flags', () => ({ getFlags: () => mockGetFlags() }))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { outilMasque, FLAG_PAR_INTENTION, intentionsMasquees } from '@/lib/flags/yaye'
import { catalogDefaults, getFlagDef } from '@/lib/flags/catalog'

const masque = (key: string) => ({ ...catalogDefaults(), [key]: false })
const GRAPHE = 'query_knowledge_graph'

beforeEach(() => {
  jest.clearAllMocks()
  mockGetFlags.mockResolvedValue(catalogDefaults())
})

describe('table intention → fonctionnalité', () => {
  it('ne rattache une intention qu’à une fonctionnalité réelle', () => {
    for (const key of Object.values(FLAG_PAR_INTENTION)) {
      expect(getFlagDef(key)).toBeDefined()
    }
  })

  it('couvre chaque intention qui rend des données de module', () => {
    for (const intent of [
      'livre_disponible',
      'ressources_competences',
      'recherche',
      'eligibilite',
      'parcours',
      'apercu_marche',
      'ecart_competences',
      'reco_collaborative',
      'acteurs_programme',
    ]) {
      expect(FLAG_PAR_INTENTION[intent]).toBeDefined()
    }
  })
})

describe('la fuite que ce correctif ferme', () => {
  it('refuse `livre_disponible` quand la bibliothèque est masquée', async () => {
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    await expect(
      outilMasque(GRAPHE, ['beneficiaire'], { intent: 'livre_disponible' }),
    ).resolves.toBe(true)
  })

  it('refuse `ressources_competences` quand les ressources sont masquées', async () => {
    mockGetFlags.mockResolvedValue(masque('m6.ressources'))
    await expect(
      outilMasque(GRAPHE, ['beneficiaire'], { intent: 'ressources_competences' }),
    ).resolves.toBe(true)
  })

  it('refuse `acteurs_programme` quand les centres sont masqués', async () => {
    mockGetFlags.mockResolvedValue(masque('m4.centres'))
    await expect(
      outilMasque(GRAPHE, ['beneficiaire'], { intent: 'acteurs_programme' }),
    ).resolves.toBe(true)
  })
})

describe('ce que le correctif ne doit pas casser', () => {
  it('laisse les autres intentions quand seule la bibliothèque ferme', async () => {
    // C'est tout l'intérêt d'une garde par intention : fermer la bibliothèque ne prive pas
    // Yaye de son raisonnement sur les offres.
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    await expect(outilMasque(GRAPHE, ['beneficiaire'], { intent: 'recherche' })).resolves.toBe(
      false,
    )
  })

  it('laisse tout passer quand rien n’est masqué', async () => {
    for (const intent of Object.keys(FLAG_PAR_INTENTION)) {
      await expect(outilMasque(GRAPHE, ['beneficiaire'], { intent })).resolves.toBe(false)
    }
  })

  it('respecte la face d’audience', async () => {
    // La bibliothèque ne ferme que pour les jeunes et les anonymes : le conseiller garde
    // l'intention.
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    await expect(
      outilMasque(GRAPHE, ['conseiller'], { intent: 'livre_disponible' }),
    ).resolves.toBe(false)
  })

  it('laisse passer un administrateur', async () => {
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    await expect(outilMasque(GRAPHE, ['admin'], { intent: 'livre_disponible' })).resolves.toBe(
      false,
    )
  })

  it('bloque un visiteur sans session', async () => {
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    await expect(outilMasque(GRAPHE, null, { intent: 'livre_disponible' })).resolves.toBe(true)
  })

  it('laisse passer si l’état est illisible', async () => {
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(
      outilMasque(GRAPHE, ['beneficiaire'], { intent: 'livre_disponible' }),
    ).resolves.toBe(false)
  })

  it('ne masque pas l’outil quand l’intention est absente ou inconnue', async () => {
    // Sans intention lisible, on ne devine pas : l'outil s'exécute et sa propre validation
    // rejette l'intention inconnue. Masquer ici reviendrait à fermer l'outil entier.
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    await expect(outilMasque(GRAPHE, ['beneficiaire'])).resolves.toBe(false)
    await expect(outilMasque(GRAPHE, ['beneficiaire'], { intent: 'inconnue' })).resolves.toBe(
      false,
    )
  })
})

describe('intentionsMasquees — pour retirer l’intention du modèle', () => {
  // Refuser à l'exécution ne suffit pas : l'agent tolère les appels émis en texte brut, et
  // le modèle continuerait de tenter une intention qu'on lui décrit encore. L'énumération
  // envoyée au modèle doit perdre l'intention, comme le niveau 2 l'a fait pour les outils.
  it('ne rend rien quand tout est ouvert', async () => {
    await expect(intentionsMasquees(['beneficiaire'])).resolves.toEqual(new Set())
  })

  it('rend l’intention du module fermé', async () => {
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    await expect(intentionsMasquees(['beneficiaire'])).resolves.toEqual(
      new Set(['livre_disponible']),
    )
  })

  it('ne rend rien pour un administrateur', async () => {
    mockGetFlags.mockResolvedValue(masque('m4.bibliotheque'))
    await expect(intentionsMasquees(['admin'])).resolves.toEqual(new Set())
  })
})
