/**
 * @jest-environment node
 *
 * GUIC-706 — API d'administration des fonctionnalités.
 *
 * La validation vit côté serveur et pas seulement côté interface : un toggle grisé
 * n'empêche pas un appel direct. Chaque refus attendu ici correspond à un geste qu'un
 * navigateur ne proposerait pas mais qu'un `curl` permet.
 */
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('@/lib/audit', () => ({ recordAudit: jest.fn() }))

const mockGetFlags = jest.fn()
const mockSetFlags = jest.fn()
jest.mock('@/lib/flags', () => ({
  getFlags: (...a: unknown[]) => mockGetFlags(...a),
  setFlags: (...a: unknown[]) => mockSetFlags(...a),
}))
const mockPurgeSitemap = jest.fn()
jest.mock('@/lib/seo/sitemap', () => ({ purgerCacheSitemap: () => mockPurgeSitemap() }))
const mockRevalidate = jest.fn()
jest.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => mockRevalidate(...a) }))

const mockGetHits = jest.fn()
jest.mock('@/lib/flags/metrics', () => ({ getFlagHits: (...a: unknown[]) => mockGetHits(...a) }))

import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { GET, PUT } from '@/app/api/admin/systeme/flags/route'
import { catalogDefaults, FEATURE_FLAGS } from '@/lib/flags/catalog'

const mockSession = getSession as jest.Mock

const ADMIN = { cjsUid: 'a1', roles: ['admin'] }
const MODERATEUR = { cjsUid: 'm1', roles: ['moderator'] }
const CONSEILLER = { cjsUid: 'c1', roles: ['conseiller'] }

const MASQUABLE = FEATURE_FLAGS.find((f) => !f.locked && f.defaultEnabled)!.key
const VERROUILLE = FEATURE_FLAGS.find((f) => f.locked)!.key

function requete(body: unknown, url = 'http://localhost/api/admin/systeme/flags'): NextRequest {
  return new NextRequest(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetFlags.mockResolvedValue(catalogDefaults())
  mockSetFlags.mockImplementation(async (bascules: { key: string; enabled: boolean }[]) => ({
    ...catalogDefaults(),
    ...Object.fromEntries(bascules.map((b) => [b.key, b.enabled])),
  }))
  mockGetHits.mockResolvedValue({})
  mockPurgeSitemap.mockResolvedValue(undefined)
})

describe('GET — consultation', () => {
  it('rend l’état, le catalogue et les compteurs à un administrateur', async () => {
    mockSession.mockResolvedValue(ADMIN)
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.flags).toBeDefined()
    expect(json.data.catalogue).toHaveLength(FEATURE_FLAGS.length)
    expect(json.data.hits).toBeDefined()
  })

  it('reste ouvert au modérateur', async () => {
    // Lecture autorisée : un modérateur doit pouvoir constater qu'un module est masqué
    // plutôt que conclure à une panne devant une file vide.
    mockSession.mockResolvedValue(MODERATEUR)
    expect((await GET()).status).toBe(200)
  })

  it('indique au client ce qu’il a le droit de modifier', async () => {
    // Sans ce drapeau, l'interface afficherait des toggles actifs à un modérateur, qui
    // se heurterait à un 403 après coup.
    mockSession.mockResolvedValue(MODERATEUR)
    expect((await (await GET()).json()).data.canManage).toBe(false)
    mockSession.mockResolvedValue(ADMIN)
    expect((await (await GET()).json()).data.canManage).toBe(true)
  })

  it('refuse un conseiller', async () => {
    mockSession.mockResolvedValue(CONSEILLER)
    expect((await GET()).status).toBe(403)
  })

  it('refuse une requête sans session', async () => {
    mockSession.mockResolvedValue(null)
    expect((await GET()).status).toBe(403)
  })
})

describe('PUT — bascule', () => {
  it('applique la bascule demandée par un administrateur', async () => {
    mockSession.mockResolvedValue(ADMIN)
    const res = await PUT(requete({ key: MASQUABLE, enabled: false, note: 'vague 1' }))
    expect(res.status).toBe(200)
    expect(mockSetFlags).toHaveBeenCalledWith(
      [{ key: MASQUABLE, enabled: false }],
      expect.objectContaining({ updatedBy: 'a1', note: 'vague 1' }),
    )
  })

  it('refuse le modérateur', async () => {
    // La garde d'écriture, testée là où elle compte : sur la route, pas seulement sur le
    // prédicat.
    mockSession.mockResolvedValue(MODERATEUR)
    const res = await PUT(requete({ key: MASQUABLE, enabled: false }))
    expect(res.status).toBe(403)
    expect(mockSetFlags).not.toHaveBeenCalled()
  })

  it('refuse un corps sans clé exploitable', async () => {
    mockSession.mockResolvedValue(ADMIN)
    expect((await PUT(requete({}))).status).toBe(400)
    expect(mockSetFlags).not.toHaveBeenCalled()
  })

  it('refuse un corps illisible', async () => {
    mockSession.mockResolvedValue(ADMIN)
    const req = new NextRequest('http://localhost/api/admin/systeme/flags', {
      method: 'PUT',
      body: 'pas du json',
      headers: { 'Content-Type': 'application/json' },
    })
    expect((await PUT(req)).status).toBe(400)
  })

  it('traduit un refus du service en 400 plutôt qu’en 500', async () => {
    // Clé inconnue, flag verrouillé, dépendance masquée : ce sont des erreurs de demande,
    // pas des pannes. Un 500 les ferait passer pour un incident.
    mockSession.mockResolvedValue(ADMIN)
    mockSetFlags.mockRejectedValue(new Error('Fonctionnalité verrouillée'))
    expect((await PUT(requete({ key: VERROUILLE, enabled: false }))).status).toBe(400)
  })

  it('journalise la bascule avec son sens et sa raison', async () => {
    // Une bascule change ce que voient 22 000 personnes sans passer par un déploiement :
    // le journal d'audit est la seule trace de l'acte.
    mockSession.mockResolvedValue(ADMIN)
    await PUT(requete({ key: MASQUABLE, enabled: false, note: 'incident' }))
    expect(recordAudit).toHaveBeenCalledWith(
      'a1',
      'feature.flag.update',
      expect.objectContaining({
        targetType: 'feature_flag',
        targetId: MASQUABLE,
        meta: expect.objectContaining({ enabled: false, note: 'incident', sequence: [MASQUABLE] }),
      }),
    )
  })

  it('purge le sitemap, qui a deux caches et prendrait sinon deux heures', async () => {
    // Redis 1 h ET l'ISR de Next (revalidate 3600). Sans les purger, les moteurs
    // continueraient d'annoncer une page masquée pendant que tout le reste a basculé
    // en quelques secondes — et enverraient du trafic vers un 404.
    mockSession.mockResolvedValue(ADMIN)
    await PUT(requete({ key: MASQUABLE, enabled: false }))
    expect(mockPurgeSitemap).toHaveBeenCalled()
    expect(mockRevalidate).toHaveBeenCalledWith('/sitemap.xml')
  })

  it('ne journalise pas une bascule refusée', async () => {
    mockSession.mockResolvedValue(MODERATEUR)
    await PUT(requete({ key: MASQUABLE, enabled: false }))
    expect(recordAudit).not.toHaveBeenCalled()
  })
})

describe('GET ?cascade — annoncer avant d’appliquer', () => {
  it('rend la séquence sans rien basculer', async () => {
    // Le panneau doit pouvoir annoncer ce qui va changer AVANT de demander confirmation.
    // Un refus sec dit ce qui bloque, il ne dit pas comment faire.
    mockSession.mockResolvedValue(ADMIN)
    const parent = FEATURE_FLAGS.find(
      (f) => !f.locked && FEATURE_FLAGS.some((o) => o.dependsOn.includes(f.key)),
    )!
    const json = await (
      await GET(new NextRequest(`http://localhost/api/admin/systeme/flags?cascade=${parent.key}&enabled=false`))
    ).json()
    expect(json.data.sequence.length).toBeGreaterThan(1)
    expect(json.data.sequence.at(-1).key).toBe(parent.key)
    expect(mockSetFlags).not.toHaveBeenCalled()
  })

  it('n’annonce que ce qui change réellement', async () => {
    // Une fonctionnalité déjà dans l'état visé ne doit pas figurer dans le décompte :
    // annoncer « 6 bascules » quand 4 sont déjà faites induit en erreur.
    mockSession.mockResolvedValue(ADMIN)
    const parent = FEATURE_FLAGS.find(
      (f) => !f.locked && FEATURE_FLAGS.some((o) => o.dependsOn.includes(f.key)),
    )!
    mockGetFlags.mockResolvedValue({ ...catalogDefaults(), [parent.key]: false })
    const json = await (
      await GET(new NextRequest(`http://localhost/api/admin/systeme/flags?cascade=${parent.key}&enabled=false`))
    ).json()
    expect(json.data.sequence.map((s: { key: string }) => s.key)).not.toContain(parent.key)
  })
})

describe('PUT cascade — appliquer le groupe', () => {
  it('applique toute la séquence en une opération', async () => {
    mockSession.mockResolvedValue(ADMIN)
    const parent = FEATURE_FLAGS.find(
      (f) => !f.locked && FEATURE_FLAGS.some((o) => o.dependsOn.includes(f.key)),
    )!
    await PUT(requete({ key: parent.key, enabled: false, cascade: true }))
    const sequence = mockSetFlags.mock.calls[0][0] as { key: string }[]
    expect(sequence.length).toBeGreaterThan(1)
    expect(sequence.at(-1)!.key).toBe(parent.key)
  })

  it('ne journalise qu’une entrée pour tout le groupe', async () => {
    // Cinq lignes d'audit séparées seraient à recoller après coup lors d'une analyse
    // post-incident. La séquence appliquée figure dans le méta de l'entrée unique.
    mockSession.mockResolvedValue(ADMIN)
    const parent = FEATURE_FLAGS.find(
      (f) => !f.locked && FEATURE_FLAGS.some((o) => o.dependsOn.includes(f.key)),
    )!
    await PUT(requete({ key: parent.key, enabled: false, cascade: true }))
    expect(recordAudit).toHaveBeenCalledTimes(1)
    expect((recordAudit as jest.Mock).mock.calls[0][2].meta.sequence.length).toBeGreaterThan(1)
  })
})

describe('GET ?format=export — instantané', () => {
  it('rend une configuration réimportable', async () => {
    mockSession.mockResolvedValue(ADMIN)
    const json = await (
      await GET(new NextRequest('http://localhost/api/admin/systeme/flags?format=export'))
    ).json()
    // Instantané plat `{ clé: booléen }` : c'est ce qui permet de rejouer en production
    // une configuration éprouvée en recette, et de sauvegarder l'état avant un incident.
    expect(json.data.flags).toEqual(catalogDefaults())
    expect(json.data.exportedAt).toBeDefined()
  })
})
