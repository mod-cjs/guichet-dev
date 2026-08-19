/**
 * @jest-environment node
 *
 * GUIC-709 — Compter les téléchargements de ressources.
 *
 * Aujourd'hui le CTA d'une fiche pointe droit sur l'URL externe : le fichier
 * part sans jamais traverser nos serveurs, donc rien ne le mesure. On ne sait
 * pas quelles ressources servent réellement.
 *
 * Le seul endroit qui PROUVE qu'un fichier a été demandé est le proxy, qui le
 * sert déjà (`?download=1`). On y enregistre l'événement, plutôt que d'ajouter
 * un compteur cliqué côté navigateur — un clic n'est pas un téléchargement.
 *
 * Deux exigences distinctes :
 *  1. le téléchargement est enregistré comme tel, pas comme une consultation ;
 *  2. il n'incrémente PAS `vues`. Confondre les deux gonflerait l'audience
 *     d'une ressource à chaque récupération de fichier, et « Les plus
 *     consultées » deviendrait « les plus téléchargées » sans le dire.
 */
import { NextRequest } from 'next/server'

const mockFindRessource = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { ressource: { findFirst: (...a: unknown[]) => mockFindRessource(...a) } },
}))

jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue(null) }))

const mockTrack = jest.fn()
jest.mock('@/lib/analytics/consultations', () => {
  const reel = jest.requireActual('@/lib/analytics/consultations')
  return { ...reel, trackConsultation: (...a: unknown[]) => mockTrack(...a) }
})

jest.mock('@/lib/curation/robot/ssrf-guard', () => ({
  ipPubliqueValidee: jest.fn().mockResolvedValue('93.184.216.34'),
}))

import { GET } from '@/app/api/ressources/[id]/proxy/route'

const ID = '99fe52fa-db01-4f5a-a95f-4214f7a029bf'

function requete(query: string) {
  return new NextRequest(`http://localhost/api/ressources/${ID}/proxy${query}`)
}

const params = Promise.resolve({ id: ID })

beforeEach(() => {
  jest.clearAllMocks()
  mockFindRessource.mockResolvedValue({
    id: ID, titre: 'Guide CV', url: 'https://exemple.org/g.pdf', type: 'PDF', estPublic: true,
  })
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: new ReadableStream(),
    headers: new Headers({ 'content-type': 'application/pdf', 'content-length': '2516582' }),
  }) as never
})

describe('GUIC-709 — le proxy enregistre les téléchargements', () => {
  it('given ?download=1, then enregistre un événement « telechargement »', async () => {
    const res = await GET(requete('?download=1'), { params })

    expect(res.status).toBe(200)
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        typeEntite: 'ressource',
        entiteId:   ID,
        typeEvent:  'telechargement',
      }),
    )
  })

  it('given une consultation inline (sans ?download), then n\'enregistre RIEN', async () => {
    // Le viewer charge le PDF à chaque affichage de la fiche : compter là
    // ferait exploser le compteur sans qu'un seul fichier ait été emporté.
    await GET(requete(''), { params })
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('n\'enregistre pas un téléchargement quand la source échoue', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, body: null, headers: new Headers() }) as never
    const res = await GET(requete('?download=1'), { params })

    expect(res.status).toBe(502)
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('ne gonfle jamais le compteur de vues', async () => {
    await GET(requete('?download=1'), { params })
    const arg = mockTrack.mock.calls[0][0] as { typeEvent: string }
    // `incrementerCache` ne touche `vues` que pour `typeEvent === 'consultation'`.
    expect(arg.typeEvent).not.toBe('consultation')
  })
})
