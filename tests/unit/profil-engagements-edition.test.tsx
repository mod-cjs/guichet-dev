/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Saisie des engagements associatifs.
 *
 * `Engagement` est le type créé pour la timeline unifiée : avant lui, le
 * bénévolat était soit absent, soit saisi comme une expérience professionnelle,
 * ce qui fausse la lecture d'un parcours. Les routes existent ; sans cette
 * interface, la table reste vide et la timeline n'affichera jamais le type
 * qu'on a créé exprès.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { SectionEngagements } from '@/components/profil/SectionEngagements'

const ENGAGEMENTS = [
  {
    id: 'g1',
    role: 'Bénévole sensibilisation',
    organisation: 'Jeunesse & Environnement',
    dateDebut: '2022-03-01',
    dateFin: '2023-12-31',
    description: null,
  },
]

function mockFetch(reponse: { ok: boolean; body: unknown; status?: number }) {
  const fn = jest.fn().mockResolvedValue({
    ok: reponse.ok,
    status: reponse.status ?? (reponse.ok ? 201 : 400),
    json: async () => reponse.body,
  })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

afterEach(() => jest.restoreAllMocks())

describe('GUIC-689 — liste des engagements', () => {
  it('affiche les engagements existants', () => {
    render(<SectionEngagements engagements={ENGAGEMENTS} />)
    expect(screen.getByText(/Bénévole sensibilisation/)).toBeInTheDocument()
    expect(screen.getByText(/Jeunesse & Environnement/)).toBeInTheDocument()
  })

  it('sans engagement, explique à quoi ça sert plutôt que d’afficher un vide', () => {
    render(<SectionEngagements engagements={[]} />)
    expect(screen.getByTestId('engagements-vide')).toBeInTheDocument()
  })
})

describe('GUIC-689 — ajout d’un engagement', () => {
  function ouvrirFormulaire() {
    render(<SectionEngagements engagements={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
  }

  it('ouvre le formulaire au clic', () => {
    ouvrirFormulaire()
    expect(screen.getByRole('textbox', { name: /rôle/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /organisation/i })).toBeInTheDocument()
  })

  it('envoie les champs au serveur', async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: { ...ENGAGEMENTS[0], id: 'g9' } } })
    ouvrirFormulaire()
    fireEvent.change(screen.getByRole('textbox', { name: /rôle/i }), { target: { value: 'Animateur' } })
    fireEvent.change(screen.getByRole('textbox', { name: /organisation/i }), { target: { value: 'Club de quartier' } })
    fireEvent.change(screen.getByLabelText(/début/i), { target: { value: '2024-01-15' } })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/profil/engagements')
    const corps = JSON.parse((init as RequestInit).body as string)
    expect(corps).toMatchObject({ role: 'Animateur', organisation: 'Club de quartier', dateDebut: '2024-01-15' })
  })

  it('une fin non renseignée part à null — c’est un engagement en cours', async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: { ...ENGAGEMENTS[0], id: 'g9' } } })
    ouvrirFormulaire()
    fireEvent.change(screen.getByRole('textbox', { name: /rôle/i }), { target: { value: 'Animateur' } })
    fireEvent.change(screen.getByRole('textbox', { name: /organisation/i }), { target: { value: 'Club' } })
    fireEvent.change(screen.getByLabelText(/début/i), { target: { value: '2024-01-15' } })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).dateFin).toBeNull()
  })

  it('refuse d’envoyer un formulaire incomplet', () => {
    const fetchMock = mockFetch({ ok: true, body: {} })
    ouvrirFormulaire()
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('affiche l’erreur du serveur et garde le formulaire ouvert', async () => {
    mockFetch({ ok: false, body: { error: { message: 'La date de fin doit être postérieure' } } })
    ouvrirFormulaire()
    fireEvent.change(screen.getByRole('textbox', { name: /rôle/i }), { target: { value: 'Animateur' } })
    fireEvent.change(screen.getByRole('textbox', { name: /organisation/i }), { target: { value: 'Club' } })
    fireEvent.change(screen.getByLabelText(/début/i), { target: { value: '2024-01-15' } })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/postérieure/i))
    expect(screen.getByRole('textbox', { name: /rôle/i })).toHaveValue('Animateur')
  })
})

describe('GUIC-689 — retrait d’un engagement', () => {
  it('chaque engagement porte un bouton nommé', () => {
    render(<SectionEngagements engagements={ENGAGEMENTS} />)
    expect(screen.getByRole('button', { name: /supprimer bénévole sensibilisation/i })).toBeInTheDocument()
  })

  it('un échec laisse la ligne en place', async () => {
    mockFetch({ ok: false, status: 404, body: { error: { message: 'Engagement introuvable' } } })
    render(<SectionEngagements engagements={ENGAGEMENTS} />)
    fireEvent.click(screen.getByRole('button', { name: /supprimer bénévole sensibilisation/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText(/Bénévole sensibilisation/)).toBeInTheDocument()
  })
})
