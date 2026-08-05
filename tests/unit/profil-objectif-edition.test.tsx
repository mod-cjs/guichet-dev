/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Édition en place de « Objectif & secteurs visés ».
 *
 * Les colonnes créées par la migration ne servent à rien tant que rien ne
 * permet de les saisir. Et l'édition doit vivre DANS la carte qui affiche la
 * donnée : la faire ailleurs (comme `SectionProfil` le faisait pour les
 * secteurs) sépare la lecture de l'écriture et oblige à chercher.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { ObjectiveCard } from '@/components/profil/ObjectiveCard'

const BASE = {
  objectif: null,
  secteurs: [] as string[],
  typesRecherches: [] as string[],
  regionsMobilite: [] as string[],
}

function mockFetchOk() {
  const fn = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { completionScore: 42 } }),
  })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

afterEach(() => jest.restoreAllMocks())

describe('GUIC-689 — édition de l’objectif', () => {
  it('propose un bouton Modifier', () => {
    render(<ObjectiveCard {...BASE} onSaved={() => {}} />)
    expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
  })

  it('ouvre le formulaire au clic', () => {
    render(<ObjectiveCard {...BASE} onSaved={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    expect(screen.getByLabelText(/mon objectif/i)).toBeInTheDocument()
  })

  it('envoie les trois champs au serveur', async () => {
    const fetchMock = mockFetchOk()
    render(<ObjectiveCard {...BASE} onSaved={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    fireEvent.change(screen.getByLabelText(/mon objectif/i), {
      target: { value: 'Ouvrir un atelier de couture.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^formation$/i }))
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const corps = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(corps.objectif).toBe('Ouvrir un atelier de couture.')
    expect(corps.typesRecherches).toContain('formation')
    expect(corps).toHaveProperty('regionsMobilite')
  })

  it('un objectif vidé part à null, jamais en chaîne vide', async () => {
    const fetchMock = mockFetchOk()
    render(<ObjectiveCard {...BASE} objectif="Ancien texte" onSaved={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    fireEvent.change(screen.getByLabelText(/mon objectif/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const corps = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(corps.objectif).toBeNull()
  })

  it('remonte le nouveau score de complétion', async () => {
    mockFetchOk()
    const onSaved = jest.fn()
    render(<ObjectiveCard {...BASE} onSaved={onSaved} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ completionScore: 42 })))
  })

  it('affiche l’erreur du serveur au lieu de faire croire à un succès', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Région inconnue' } }),
    }) as unknown as typeof fetch
    render(<ObjectiveCard {...BASE} onSaved={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/région inconnue/i))
    // Le formulaire reste ouvert : refermer effacerait la saisie.
    expect(screen.getByLabelText(/mon objectif/i)).toBeInTheDocument()
  })
})
