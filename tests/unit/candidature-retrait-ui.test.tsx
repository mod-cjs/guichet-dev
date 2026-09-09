/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Le bouton « Retirer ma candidature », côté interface.
 *
 * Ce bouton a déjà menti une fois : il existait sans `onClick`, sans route et
 * sans statut en base. Les tests ci-dessous vérifient donc qu'il AGIT — un appel
 * réseau réellement émis, sur la bonne URL — et pas seulement qu'il s'affiche.
 *
 * Deux règles viennent de la maquette v5 (`candidatures-web.jsx:204,216`) :
 * il disparaît dès qu'une décision existe, et le retrait passe par une
 * confirmation explicite (action irréversible).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { RetraitCandidature } from '@/components/candidatures/RetraitCandidature'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))

function mockFetch(ok = true, status = 200, body: unknown = { data: { statut: 'Retiree' } }) {
  const fn = jest.fn().mockResolvedValue({ ok, status, json: async () => body })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

afterEach(() => jest.restoreAllMocks())

describe('GUIC-689 — quand le bouton s’affiche', () => {
  it('candidature envoyée → le bouton est là', () => {
    render(<RetraitCandidature candidatureId="c1" statut="En_attente" titreOffre="Stage data" />)
    expect(screen.getByRole('button', { name: /retirer ma candidature/i })).toBeInTheDocument()
  })

  it('candidature vue → le bouton est toujours là', () => {
    render(<RetraitCandidature candidatureId="c1" statut="Vue" titreOffre="Stage data" />)
    expect(screen.getByRole('button', { name: /retirer ma candidature/i })).toBeInTheDocument()
  })

  it('retenue → AUCUN bouton : le recruteur a statué', () => {
    render(<RetraitCandidature candidatureId="c1" statut="Retenue" titreOffre="Stage data" />)
    expect(screen.queryByRole('button', { name: /retirer ma candidature/i })).toBeNull()
  })

  it('refusée → aucun bouton non plus', () => {
    render(<RetraitCandidature candidatureId="c1" statut="Refusee" titreOffre="Stage data" />)
    expect(screen.queryByRole('button', { name: /retirer ma candidature/i })).toBeNull()
  })

  it('déjà retirée → aucun bouton', () => {
    render(<RetraitCandidature candidatureId="c1" statut="Retiree" titreOffre="Stage data" />)
    expect(screen.queryByRole('button', { name: /retirer ma candidature/i })).toBeNull()
  })
})

describe('GUIC-689 — la confirmation protège une action irréversible', () => {
  it('un clic n’appelle RIEN — il ouvre la confirmation', async () => {
    const fetchMock = mockFetch()
    render(<RetraitCandidature candidatureId="c1" statut="En_attente" titreOffre="Stage data" />)

    fireEvent.click(screen.getByRole('button', { name: /retirer ma candidature/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('la confirmation nomme l’offre et annonce l’irréversibilité', async () => {
    mockFetch()
    render(<RetraitCandidature candidatureId="c1" statut="En_attente" titreOffre="Stage data" />)
    fireEvent.click(screen.getByRole('button', { name: /retirer ma candidature/i }))

    const dialogue = await screen.findByRole('dialog')
    expect(dialogue.textContent).toMatch(/Stage data/)
    expect(dialogue.textContent).toMatch(/irréversible/i)
    // La modale promet la notification : la route doit tenir cette promesse.
    expect(dialogue.textContent).toMatch(/recruteur/i)
  })

  it('« Garder ma candidature » referme sans rien appeler', async () => {
    const fetchMock = mockFetch()
    render(<RetraitCandidature candidatureId="c1" statut="En_attente" titreOffre="Stage data" />)
    fireEvent.click(screen.getByRole('button', { name: /retirer ma candidature/i }))
    fireEvent.click(await screen.findByRole('button', { name: /garder ma candidature/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('GUIC-689 — la confirmation agit vraiment', () => {
  it('appelle la route de retrait en POST', async () => {
    const fetchMock = mockFetch()
    render(<RetraitCandidature candidatureId="cand-42" statut="En_attente" titreOffre="Stage data" />)
    fireEvent.click(screen.getByRole('button', { name: /retirer ma candidature/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^retirer$/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/candidatures/cand-42/retrait')
    expect((init as RequestInit).method).toBe('POST')
  })

  it('un échec serveur reste VISIBLE — sinon l’utilisateur croit avoir retiré', async () => {
    mockFetch(false, 409, { error: { code: 'RETRAIT_IMPOSSIBLE', message: 'Le recruteur a déjà statué.' } })
    render(<RetraitCandidature candidatureId="c1" statut="En_attente" titreOffre="Stage data" />)
    fireEvent.click(screen.getByRole('button', { name: /retirer ma candidature/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^retirer$/i }))

    const alerte = await screen.findByRole('alert')
    expect(alerte.textContent).toMatch(/déjà statué/i)
  })

  it('pendant l’appel, le bouton de confirmation est désactivé (pas de double retrait)', async () => {
    let resoudre: (v: unknown) => void = () => {}
    const fn = jest.fn().mockReturnValue(new Promise((r) => { resoudre = r }))
    global.fetch = fn as unknown as typeof fetch

    render(<RetraitCandidature candidatureId="c1" statut="En_attente" titreOffre="Stage data" />)
    fireEvent.click(screen.getByRole('button', { name: /retirer ma candidature/i }))
    const confirmer = await screen.findByRole('button', { name: /^retirer$/i })
    fireEvent.click(confirmer)

    await waitFor(() => expect(confirmer).toBeDisabled())
    resoudre({ ok: true, status: 200, json: async () => ({ data: { statut: 'Retiree' } }) })
  })
})
