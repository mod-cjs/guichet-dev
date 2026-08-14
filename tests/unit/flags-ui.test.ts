/**
 * @jest-environment node
 *
 * GUIC-706 — Filtrage des navigations (lot 3).
 *
 * Choix de conception : on filtre par `href`, pas par identifiant d'item. Les neuf barres
 * de navigation ont des formes différentes — certaines portent des `id`, d'autres non —
 * mais toutes portent un lien. Réutiliser `flagForPath` évite d'instrumenter neuf fichiers
 * et garantit que la navigation et le gate tranchent avec la MÊME règle : un item ne peut
 * pas rester visible alors que sa route répond 404.
 */
const mockGetFlags = jest.fn()
jest.mock('@/lib/flags', () => ({ getFlags: () => mockGetFlags() }))

import { masquesUtilisateur, lienMasque, filtrerSections } from '@/lib/flags/ui'
import { catalogDefaults, FEATURE_FLAGS } from '@/lib/flags/catalog'

const JEUNE = FEATURE_FLAGS.find(
  (f) => f.closes.includes('beneficiaire') && f.userRoutes.length > 0 && !f.locked,
)!
const masque = (key: string) => ({ ...catalogDefaults(), [key]: false })

beforeEach(() => {
  jest.clearAllMocks()
  mockGetFlags.mockResolvedValue(catalogDefaults())
})

describe('masquesUtilisateur', () => {
  it('ne rend rien quand tout est ouvert', async () => {
    await expect(masquesUtilisateur(['beneficiaire'])).resolves.toEqual([])
  })

  it('rend les clés masquées pour la face du visiteur', async () => {
    mockGetFlags.mockResolvedValue(masque(JEUNE.key))
    await expect(masquesUtilisateur(['beneficiaire'])).resolves.toContain(JEUNE.key)
  })

  it('ne rend rien à un administrateur', async () => {
    // L'admin voit la navigation entière : c'est ainsi qu'il atteint ce qu'il prépare.
    mockGetFlags.mockResolvedValue(masque(JEUNE.key))
    await expect(masquesUtilisateur(['admin', 'beneficiaire'])).resolves.toEqual([])
  })

  it('ignore un flag masqué qui ne ferme pas cette face', async () => {
    const jeunesSeuls = FEATURE_FLAGS.find(
      (f) => f.closes.includes('beneficiaire') && !f.closes.includes('conseiller') && !f.locked,
    )!
    mockGetFlags.mockResolvedValue(masque(jeunesSeuls.key))
    await expect(masquesUtilisateur(['conseiller', 'beneficiaire'])).resolves.not.toContain(
      jeunesSeuls.key,
    )
  })

  it('traite un visiteur sans session comme anonyme', async () => {
    const anonyme = FEATURE_FLAGS.find((f) => f.closes.includes('anonyme') && !f.locked)!
    mockGetFlags.mockResolvedValue(masque(anonyme.key))
    await expect(masquesUtilisateur(null)).resolves.toContain(anonyme.key)
  })

  it('rend une navigation entière plutôt que d’échouer si l’état est illisible', async () => {
    mockGetFlags.mockRejectedValue(new Error('panne'))
    await expect(masquesUtilisateur(['beneficiaire'])).resolves.toEqual([])
  })
})

describe('lienMasque', () => {
  it('masque un lien dont la route relève d’un flag fermé', () => {
    expect(lienMasque(JEUNE.userRoutes[0], [JEUNE.key])).toBe(true)
  })

  it('laisse un lien dont le flag est ouvert', () => {
    expect(lienMasque(JEUNE.userRoutes[0], [])).toBe(false)
  })

  it('ignore la chaîne de requête', () => {
    // La barre latérale jeune pointe vers `/opportunites?type=Emploi` : sans découpe, le
    // rattachement au flag échouerait et l'item resterait visible.
    expect(lienMasque('/opportunites?type=Emploi', ['m3.opportunites'])).toBe(true)
  })

  it('laisse passer un lien externe', () => {
    // Les liens YEAH et e-learning ne relèvent d'aucun flag et ne doivent pas disparaître.
    expect(lienMasque('https://yeah.consortiumjeunessesenegal.org', ['m3.opportunites'])).toBe(false)
  })

  it('laisse passer une route hors catalogue', () => {
    expect(lienMasque('/auth/connexion', ['m3.opportunites'])).toBe(false)
  })
})

describe('filtrerSections — la règle du conteneur', () => {
  const sections = [
    { title: 'Découvrir', items: [{ href: '/opportunites' }, { href: '/agenda' }] },
    { title: 'Compte', items: [{ href: '/jeune/mon-profil' }] },
  ]

  it('retire les items masqués', () => {
    const out = filtrerSections(sections, ['m3.opportunites'])
    expect(out[0].items.map((i) => i.href)).toEqual(['/agenda'])
  })

  it('retire la section ENTIÈRE quand tous ses items disparaissent', () => {
    // Le contenant est lui-même une trace : un intitulé « Découvrir » suivi de rien
    // signale qu'on a retiré quelque chose. La section part avec son titre.
    const out = filtrerSections(sections, ['m3.opportunites', 'm5.agenda'])
    expect(out.map((s) => s.title)).toEqual(['Compte'])
  })

  it('conserve une section sans titre dont il reste des items', () => {
    const out = filtrerSections([{ items: [{ href: '/agenda' }, { href: '/ressources' }] }], [
      'm5.agenda',
    ])
    expect(out).toHaveLength(1)
    expect(out[0].items).toHaveLength(1)
  })

  it('rend une liste vide plutôt qu’une coquille quand tout est masqué', () => {
    expect(filtrerSections(sections, ['m3.opportunites', 'm5.agenda', 'm2.profil'])).toHaveLength(1)
  })
})
