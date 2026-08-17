/**
 * @jest-environment node
 *
 * GUIC-689 — Sentinelle anti-"filtre décoratif".
 *
 * Le bug corrigé par ce ticket : `FiltresPanel` écrivait `remuneration=yes|no` et
 * `deadline=7|30` dans l'URL et les COMPTAIT comme filtres actifs, mais la route
 * `/api/opportunites` ne les lisait jamais — l'utilisateur cochait "Rémunérée", le
 * compteur affichait "1 filtre actif", la liste ne changeait pas.
 *
 * `FILTER_PARAM_KEYS` (exporté par `FiltresPanel.tsx`) est la source UNIQUE de la
 * liste des paramètres qu'un panneau de filtres peut écrire dans l'URL. Ce test
 * construit une requête avec une valeur d'exemple pour CHAQUE clé de cette liste et
 * vérifie qu'elle ressort bien, correctement mappée, dans l'objet transmis au
 * loader. Si une clé est ajoutée à `FILTER_PARAM_KEYS` (un nouveau filtre exposé
 * dans le panneau) sans être lue par la route, ce test échoue — il ne peut pas
 * "oublier" de couvrir le nouveau paramètre puisqu'il énumère la même liste.
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/opportunites/route'
import { FILTER_PARAM_KEYS } from '@/components/opportunites/FiltresPanel'

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

const mockListOpportunites = jest.fn()
jest.mock('@/lib/opportunites-loader', () => ({
  listOpportunites: (filtres: unknown) => mockListOpportunites(filtres),
}))

/** Une valeur d'exemple valide par clé — utilisée pour construire l'URL de test. */
const SAMPLE_VALUES: Record<(typeof FILTER_PARAM_KEYS)[number], string> = {
  domaine: 'Economie',
  type: 'Emploi',
  region: 'Thies',
  programme: 'yeah',
  remuneration: 'yes',
  deadline: '7',
}

function buildRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/opportunites?${query}`)
}

describe('GET /api/opportunites — sentinelle anti-filtre décoratif (GUIC-689)', () => {
  beforeEach(() => {
    mockListOpportunites.mockReset()
    mockListOpportunites.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
  })

  it('couvre bien les 6 clés attendues (garde contre une régression silencieuse de la liste elle-même)', () => {
    expect(FILTER_PARAM_KEYS).toEqual(['domaine', 'type', 'region', 'programme', 'remuneration', 'deadline'])
  })

  it.each(FILTER_PARAM_KEYS)(
    'le paramètre "%s" écrit par FiltresPanel est lu et transmis au loader',
    async (key) => {
      const qs = `${key}=${SAMPLE_VALUES[key]}`
      await GET(buildRequest(qs))
      const filtres = mockListOpportunites.mock.calls[0][0] as Record<string, unknown>
      expect(filtres[key]).toBeDefined()
      expect(filtres[key]).toBe(SAMPLE_VALUES[key])
    },
  )

  it('tous les filtres combinés en une seule requête ressortent tous côté loader', async () => {
    const qs = FILTER_PARAM_KEYS.map((k) => `${k}=${SAMPLE_VALUES[k]}`).join('&')
    await GET(buildRequest(qs))
    const filtres = mockListOpportunites.mock.calls[0][0] as Record<string, unknown>
    for (const key of FILTER_PARAM_KEYS) {
      expect(filtres[key]).toBe(SAMPLE_VALUES[key])
    }
  })
})
