/**
 * @jest-environment node
 *
 * Data Hub — `GET /api/admin/data-hub/export` : le dictionnaire en fichier.
 *
 * Un analyste veut trier 163 colonnes dans un tableur ou envoyer le contrat à un
 * partenaire, pas le lire à l'écran. L'export reprend le filtre actif : on exporte ce
 * qu'on voit, sinon la vue « pseudonyme » ne sert plus à rien une fois téléchargée.
 */
const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/data-hub/export/route'

function appeler(qs = ''): Promise<Response> {
  return GET(new NextRequest(`http://localhost/api/admin/data-hub/export${qs}`)) as Promise<Response>
}

beforeEach(() => jest.clearAllMocks())

describe('Data Hub — GET /api/admin/data-hub/export', () => {
  it('refuse 403 sans session', async () => {
    mockGetSession.mockResolvedValue(null)

    expect((await appeler()).status).toBe(403)
  })

  it('refuse 403 à un rôle non administrateur', async () => {
    mockGetSession.mockResolvedValue({ roles: ['beneficiaire'] })

    expect((await appeler()).status).toBe(403)
  })

  it('sert un CSF téléchargeable par défaut', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })

    const res = await appeler()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/text\/csv/)
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment; filename="dictionnaire-data-hub-\d{4}-\d{2}-\d{2}\.csv"/)
  })

  it('exporte le contrat réel, une ligne par colonne', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })

    const csv = await (await appeler()).text()
    const lignes = csv.split('\r\n')

    expect(lignes[0]).toContain('flux,chemin,replication')
    expect(lignes.length).toBeGreaterThan(100)
    expect(csv).toContain('utilisateurs')
  })

  it('respecte le filtre de gouvernance — on exporte ce qu’on voit', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })

    const complet = (await (await appeler()).text()).split('\r\n').length
    const pseudonyme = (await (await appeler('?tier=pseudonyme')).text()).split('\r\n').length

    expect(pseudonyme).toBeGreaterThan(1)
    expect(pseudonyme).toBeLessThan(complet)
  })

  it('respecte la recherche', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })

    const csv = await (await appeler('?q=utilisateurs')).text()

    expect(csv).toContain('utilisateurs')
    expect(csv).not.toContain('/api/v1/export/centres')
  })

  it('sert aussi le contrat brut en JSON pour un consommateur machine', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })

    const res = await appeler('?format=json')

    expect(res.headers.get('Content-Type')).toMatch(/application\/json/)
    expect(res.headers.get('Content-Disposition')).toMatch(/\.json"/)
    expect(Array.isArray(await res.json())).toBe(true)
  })

  it('retombe sur le CSV si le format demandé est inconnu', async () => {
    mockGetSession.mockResolvedValue({ roles: ['admin'] })

    expect((await appeler('?format=pdf')).headers.get('Content-Type')).toMatch(/text\/csv/)
  })
})
