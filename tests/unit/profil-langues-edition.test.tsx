/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Saisie des langues dans « Compétences & langues ».
 *
 * Les routes existent, la carte les affiche : sans ce maillon, la table
 * `langues_profil` reste vide à jamais.
 *
 * L'ajout et le retrait sont des appels DISTINCTS (POST / DELETE), pas un
 * formulaire global : une liste éditable en bloc obligerait à renvoyer
 * l'ensemble à chaque changement, et écraserait ce qu'un autre onglet vient
 * d'ajouter.
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

import { SkillsCard } from '@/components/profil/SkillsCard'

const LANGUES = [
  { id: 'l1', langue: 'Wolof', niveau: 'maternelle' as const },
  { id: 'l2', langue: 'Français', niveau: 'courant' as const },
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

describe('GUIC-689 — ajout d’une langue', () => {
  it('propose un formulaire d’ajout', () => {
    render(<SkillsCard competences={[]} langues={[]} editable />)
    expect(screen.getByLabelText(/langue/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/niveau/i)).toBeInTheDocument()
  })

  it('envoie la langue et son niveau', async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: { id: 'l9', langue: 'Pulaar', niveau: 'notions' } } })
    render(<SkillsCard competences={[]} langues={[]} editable />)
    fireEvent.change(screen.getByLabelText(/langue/i), { target: { value: 'Pulaar' } })
    fireEvent.change(screen.getByLabelText(/niveau/i), { target: { value: 'notions' } })
    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/profil/langues')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ langue: 'Pulaar', niveau: 'notions' })
  })

  it('affiche la langue ajoutée sans recharger la page', async () => {
    mockFetch({ ok: true, body: { data: { id: 'l9', langue: 'Pulaar', niveau: 'notions' } } })
    render(<SkillsCard competences={[]} langues={[]} editable />)
    fireEvent.change(screen.getByLabelText(/langue/i), { target: { value: 'Pulaar' } })
    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    await waitFor(() => expect(screen.getByTestId('langues-liste').textContent).toMatch(/Pulaar/))
  })

  it('n’envoie rien si le champ est vide — pas d’aller-retour inutile', () => {
    const fetchMock = mockFetch({ ok: true, body: {} })
    render(<SkillsCard competences={[]} langues={[]} editable />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('remonte le message du serveur sur doublon, sans vider la saisie', async () => {
    mockFetch({ ok: false, status: 409, body: { error: { message: 'Cette langue est déjà déclarée' } } })
    render(<SkillsCard competences={[]} langues={LANGUES} editable />)
    fireEvent.change(screen.getByLabelText(/langue/i), { target: { value: 'Wolof' } })
    fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/déjà déclarée/i))
    expect(screen.getByLabelText(/langue/i)).toHaveValue('Wolof')
  })
})

describe('GUIC-689 — retrait d’une langue', () => {
  it('chaque langue porte son propre bouton de retrait, nommé', () => {
    render(<SkillsCard competences={[]} langues={LANGUES} editable />)
    expect(screen.getByRole('button', { name: /retirer wolof/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retirer français/i })).toBeInTheDocument()
  })

  it('appelle la route de suppression et retire la ligne', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, body: { data: { id: 'l1' } } })
    render(<SkillsCard competences={[]} langues={LANGUES} editable />)
    fireEvent.click(screen.getByRole('button', { name: /retirer wolof/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/profil/langues/l1', expect.objectContaining({ method: 'DELETE' })))
    await waitFor(() => {
      const liste = screen.getByTestId('langues-liste')
      expect(within(liste).queryByText('Wolof')).not.toBeInTheDocument()
    })
  })

  it('un échec de suppression laisse la ligne en place — pas de disparition mensongère', async () => {
    mockFetch({ ok: false, status: 404, body: { error: { message: 'Langue introuvable' } } })
    render(<SkillsCard competences={[]} langues={LANGUES} editable />)
    fireEvent.click(screen.getByRole('button', { name: /retirer wolof/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(within(screen.getByTestId('langues-liste')).getByText('Wolof')).toBeInTheDocument()
  })
})

describe('GUIC-689 — la carte reste consultable sans édition', () => {
  it('sans `editable`, aucun contrôle d’écriture n’apparaît', () => {
    render(<SkillsCard competences={['Excel']} langues={LANGUES} />)
    expect(screen.queryByLabelText(/langue/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retirer/i })).not.toBeInTheDocument()
  })
})
