/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Le favori cliqué sans être connecté.
 *
 * Reproduit au rendu : anonyme, /ressources?vue=liste, clic favori → 401 →
 * /auth/connexion. Deux défauts distincts :
 *
 *  1. Le contexte est perdu : la redirection ne porte pas de destination de
 *     retour, et l'intention n'est nulle part. Après connexion, la ressource
 *     n'est pas en favori — le bouton passe pour cassé.
 *
 *  2. Le message « Ajouté aux favoris » est posé AVANT la requête. Sur une
 *     connexion lente, un refus s'annonce donc comme un succès.
 *
 * L'intention est mémorisée en `sessionStorage`, jamais dans l'URL : un lien
 * forgé `/ressources/<id>?favori=1` écrirait sinon dans le compte de
 * quiconque le suit en étant connecté.
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { RessourcesClient } from '@/components/ressources/RessourcesClient'
import type { RessourceListItem, RessourceFiltres } from '@/lib/loaders/ressources'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/ressources',
  useSearchParams: () => new URLSearchParams('vue=liste&type=Video'),
}))

const video: RessourceListItem = {
  id: '99fe52fa-db01-4f5a-a95f-4214f7a029bf',
  titre: 'Gestion du stress en entretien',
  description: 'desc',
  type: 'Video',
  theme: 'Soft skills',
  url: 'https://youtu.be/x',
  vues: 0,
  niveau: null,
  langue: null,
  categorie: null,
  createdAt: '2026-05-01T00:00:00.000Z',
}

const filtres: RessourceFiltres = { date: 'all', page: 1 }

const rendre = (connecte: boolean) =>
  render(
    <RessourcesClient
      initialItems={[video]}
      total={1}
      page={1}
      pageSize={20}
      initialFilters={filtres}
      userIsConnected={connecte}
    />,
  )

beforeEach(() => {
  pushMock.mockClear()
  sessionStorage.clear()
})

describe('GUIC-689 — clic favori sans être connecté', () => {
  it('redirige vers la connexion AVEC la destination de retour', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as never
    rendre(false)

    await act(async () => {
      fireEvent.click(screen.getAllByTestId('ressource-favori-btn')[0])
    })

    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    const cible = pushMock.mock.calls[0][0] as string
    expect(cible).toContain('/auth/connexion?next=')
    expect(decodeURIComponent(cible)).toContain('/ressources?vue=liste&type=Video')
  })

  it("mémorise l'intention hors de l'URL, pour la rejouer après connexion", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as never
    rendre(false)

    await act(async () => {
      fireEvent.click(screen.getAllByTestId('ressource-favori-btn')[0])
    })

    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    expect(sessionStorage.getItem('gj:favori-ressource')).toBe(video.id)
    // Un lien forgé ne doit pas pouvoir porter l'intention.
    expect(decodeURIComponent(pushMock.mock.calls[0][0] as string)).not.toContain('favori=1')
  })

  it("n'annonce pas « Ajouté aux favoris » quand le serveur refuse", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as never
    rendre(false)

    await act(async () => {
      fireEvent.click(screen.getAllByTestId('ressource-favori-btn')[0])
    })

    expect(screen.queryByText(/Ajouté aux favoris/)).not.toBeInTheDocument()
  })

  it('annonce le succès seulement après la réponse du serveur', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201 }) as never
    rendre(true)

    await act(async () => {
      fireEvent.click(screen.getAllByTestId('ressource-favori-btn')[0])
    })

    await waitFor(() =>
      expect(screen.getByText(/Ajouté aux favoris/)).toBeInTheDocument(),
    )
  })
})

describe('GUIC-689 — rejeu de l\'intention après connexion', () => {
  it('rejoue le favori mémorisé, puis oublie l\'intention', async () => {
    sessionStorage.setItem('gj:favori-ressource', video.id)
    const fetchMock = jest.fn().mockImplementation((url: string) =>
      url.includes('/ids')
        ? Promise.resolve({ ok: true, json: async () => ({ data: [] }) })
        : Promise.resolve({ ok: true, status: 201 }),
    )
    global.fetch = fetchMock as never

    await act(async () => {
      rendre(true)
    })

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/ressources/${video.id}/favori`,
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    expect(sessionStorage.getItem('gj:favori-ressource')).toBeNull()
  })

  it('ne rejoue PAS si la ressource est déjà en favori — le toggle la retirerait', async () => {
    sessionStorage.setItem('gj:favori-ressource', video.id)
    const fetchMock = jest.fn().mockImplementation((url: string) =>
      url.includes('/ids')
        ? Promise.resolve({ ok: true, json: async () => ({ data: [video.id] }) })
        : Promise.resolve({ ok: true, status: 200 }),
    )
    global.fetch = fetchMock as never

    await act(async () => {
      rendre(true)
    })

    await waitFor(() => expect(sessionStorage.getItem('gj:favori-ressource')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalledWith(
      `/api/ressources/${video.id}/favori`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
