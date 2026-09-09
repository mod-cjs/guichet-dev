/**
 * @jest-environment node
 *
 * GUIC-709 — Afficher le poids d'un fichier avant de le lancer.
 *
 * Au Sénégal la connexion se paie au volume : lancer un PDF sans savoir s'il
 * fait 200 Ko ou 40 Mo est une décision prise à l'aveugle. Le poids est une
 * information de décision, pas un ornement.
 *
 * Il est MESURÉ, jamais estimé : on interroge la source en HEAD et on lit son
 * `content-length`. Si la source ne le donne pas, ou est injoignable, on
 * n'affiche RIEN — un poids inventé serait pire qu'un poids absent.
 *
 * La requête passe par la garde SSRF : une URL de ressource est saisie côté
 * admin, mais elle vise un hôte arbitraire, et ce helper est appelé au rendu
 * d'une page publique.
 */
import { poidsFichier, formaterPoids } from '@/lib/ressources/poids-fichier'

const mockGarde = jest.fn()
jest.mock('@/lib/curation/robot/ssrf-guard', () => ({
  ipPubliqueValidee: (...a: unknown[]) => mockGarde(...a),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockGarde.mockResolvedValue('93.184.216.34')
})

describe('GUIC-709 — poids mesuré du fichier', () => {
  it('lit le content-length rendu par la source', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, headers: new Headers({ 'content-length': '2516582' }),
    }) as never

    await expect(poidsFichier('https://exemple.org/g.pdf')).resolves.toBe(2516582)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://exemple.org/g.pdf',
      expect.objectContaining({ method: 'HEAD' }),
    )
  })

  it('rend null quand la source ne déclare pas de taille', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: new Headers() }) as never
    await expect(poidsFichier('https://exemple.org/g.pdf')).resolves.toBeNull()
  })

  it('rend null quand la source répond en erreur', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers() }) as never
    await expect(poidsFichier('https://exemple.org/mort.pdf')).resolves.toBeNull()
  })

  it('rend null quand la source est injoignable — sans lever', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never
    await expect(poidsFichier('https://exemple.org/g.pdf')).resolves.toBeNull()
  })

  it('refuse un hôte interne SANS émettre la requête', async () => {
    mockGarde.mockResolvedValue(null)
    global.fetch = jest.fn() as never

    await expect(poidsFichier('http://169.254.169.254/latest/meta-data')).resolves.toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rend null sur un content-length aberrant plutôt qu\'un NaN affiché', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, headers: new Headers({ 'content-length': 'beaucoup' }),
    }) as never
    await expect(poidsFichier('https://exemple.org/g.pdf')).resolves.toBeNull()
  })
})

describe('GUIC-709 — mise en forme du poids', () => {
  it.each([
    [204_800, '200 Ko'],
    [2_516_582, '2,4 Mo'],
    [1_073_741_824, '1 Go'],
    [900, '900 o'],
  ])('%i octets → « %s »', (octets, attendu) => {
    expect(formaterPoids(octets)).toBe(attendu)
  })

  it('ne met pas en forme une absence de mesure', () => {
    expect(formaterPoids(null)).toBeNull()
  })
})

/**
 * GUIC-709 — Mesuré au rendu : la fiche annonçait « 1,7 Ko » pour un fichier
 * de 3 808 octets. L'écart est la compression — `fetch` envoie
 * `accept-encoding: gzip` par défaut, et le `content-length` reçu est alors la
 * taille TRANSFÉRÉE, pas celle du fichier.
 *
 * Ce n'est pas un détail : le nombre change selon ce que le client demande, il
 * n'est donc reproductible ni pour nous ni pour le navigateur du jeune. « Poids
 * du fichier » doit vouloir dire le fichier.
 */
describe('GUIC-709 — le poids est celui du fichier, pas du transfert', () => {
  it('demande explicitement une réponse non compressée', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, headers: new Headers({ 'content-length': '3808' }),
    }) as never

    await poidsFichier('https://exemple.org/g.pdf')

    const options = (global.fetch as jest.Mock).mock.calls[0][1]
    const entetes = new Headers(options.headers as HeadersInit)
    expect(entetes.get('accept-encoding')).toBe('identity')
  })
})
