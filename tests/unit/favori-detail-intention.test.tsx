/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Même défaut sur la page détail d'une ressource : le bouton
 * « Ajouter aux favoris » y est proposé aux visiteurs anonymes (vérifié au
 * rendu), et le clic les éjecte vers /auth/connexion sans destination de
 * retour ni mémoire de leur intention.
 *
 * La page détail est le retour naturel : l'utilisateur doit y revenir avec sa
 * ressource sous les yeux et son favori posé.
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { RessourceDetailClient } from '@/app/(public)/ressources/[id]/ressource-detail-client'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/ressources/99fe52fa-db01-4f5a-a95f-4214f7a029bf',
  useSearchParams: () => new URLSearchParams(''),
}))

const detail = {
  id: '99fe52fa-db01-4f5a-a95f-4214f7a029bf',
  titre: 'Gestion du stress en entretien',
  description: 'desc',
  type: 'Video' as const,
  theme: 'Soft skills',
  url: 'https://youtu.be/abc',
  vues: 3,
  niveau: null,
  langue: null,
  categorie: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  // GUIC-709 a ajouté ces deux champs à `RessourceDetail` sans mettre ce fixture à jour :
  // `tsc` était rouge sur dev, donc le hook pre-commit refusait TOUT commit du dépôt.
  // `poidsOctets: null` = « non mesuré » (une vidéo n'a pas de fichier), jamais zéro.
  telechargements: 0,
  poidsOctets: null,
}

const rendre = (connecte: boolean) =>
  render(
    <RessourceDetailClient
      detail={detail}
      pageUrl="https://guichet.example/ressources/x"
      userIsConnected={connecte}
    />,
  )

beforeEach(() => {
  pushMock.mockClear()
  sessionStorage.clear()
})

describe('GUIC-689 — favori sur la page détail, visiteur anonyme', () => {
  it('emporte la destination de retour ET mémorise la ressource visée', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as never
    rendre(false)

    await act(async () => {
      fireEvent.click(screen.getByTestId('ressource-detail-favori'))
    })

    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    const cible = decodeURIComponent(pushMock.mock.calls[0][0] as string)
    expect(cible).toContain('/auth/connexion?next=')
    expect(cible).toContain(`/ressources/${detail.id}`)
    expect(sessionStorage.getItem('gj:favori-ressource')).toBe(detail.id)
  })

  it("rejoue l'intention au retour, puis l'oublie", async () => {
    sessionStorage.setItem('gj:favori-ressource', detail.id)
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
        `/api/ressources/${detail.id}/favori`,
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    expect(sessionStorage.getItem('gj:favori-ressource')).toBeNull()
  })

  it('ne rejoue pas une intention qui retirerait un favori déjà posé', async () => {
    sessionStorage.setItem('gj:favori-ressource', detail.id)
    const fetchMock = jest.fn().mockImplementation((url: string) =>
      url.includes('/ids')
        ? Promise.resolve({ ok: true, json: async () => ({ data: [detail.id] }) })
        : Promise.resolve({ ok: true, status: 200 }),
    )
    global.fetch = fetchMock as never

    await act(async () => {
      rendre(true)
    })

    await waitFor(() => expect(sessionStorage.getItem('gj:favori-ressource')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalledWith(
      `/api/ressources/${detail.id}/favori`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
