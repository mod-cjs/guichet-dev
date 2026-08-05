/**
 * @jest-environment jsdom
 *
 * GUIC-689 — L'édition rejoint la carte qui affiche la donnée.
 *
 * Situation corrigée ici : `ObjectiveCard` affichait les secteurs et
 * `SkillsCard` les compétences, mais les deux se modifiaient dans une TROISIÈME
 * carte (`SectionProfil`). L'utilisateur voyait une valeur à un endroit et
 * devait la chercher ailleurs pour la changer — et rien à l'écran ne disait où.
 *
 * C'est la même séparation lecture/écriture que celle relevée pour la timeline :
 * elle se corrige, elle ne se documente pas.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { ObjectiveCard } from '@/components/profil/ObjectiveCard'
import { SkillsCard } from '@/components/profil/SkillsCard'

function mockFetchOk() {
  const fn = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { completionScore: 55 } }),
  })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

afterEach(() => jest.restoreAllMocks())

describe('GUIC-689 — les secteurs s’éditent dans leur carte', () => {
  const BASE = { objectif: null, secteurs: [] as string[], typesRecherches: [], regionsMobilite: [] }

  it('le formulaire propose les secteurs', () => {
    render(<ObjectiveCard {...BASE} onSaved={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    expect(screen.getByRole('button', { name: /^Agriculture$/ })).toBeInTheDocument()
  })

  it('envoie les secteurs choisis', async () => {
    const fetchMock = mockFetchOk()
    render(<ObjectiveCard {...BASE} onSaved={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Agriculture$/ }))
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const corps = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(corps.domainesInteret).toEqual(['Agriculture'])
  })

  it('un secteur déjà choisi se retire du même geste', async () => {
    const fetchMock = mockFetchOk()
    render(<ObjectiveCard {...BASE} secteurs={['Agriculture', 'Numérique']} onSaved={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Agriculture$/ }))
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const corps = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(corps.domainesInteret).toEqual(['Numérique'])
  })

  it('la carte reflète les secteurs enregistrés sans rechargement', async () => {
    mockFetchOk()
    render(<ObjectiveCard {...BASE} onSaved={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Agriculture$/ }))
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
    await waitFor(() => {
      const carte = screen.getByRole('region', { name: /objectif & secteurs visés/i })
      expect(carte.textContent).toMatch(/Agriculture/)
    })
  })
})

describe('GUIC-689 — les compétences s’éditent dans leur carte', () => {
  it('propose un champ d’ajout', () => {
    render(<SkillsCard competences={[]} langues={[]} editable />)
    expect(screen.getByRole('textbox', { name: 'Compétence' })).toBeInTheDocument()
  })

  it('envoie la liste complète, valeur ajoutée comprise', async () => {
    const fetchMock = mockFetchOk()
    render(<SkillsCard competences={['Excel']} langues={[]} editable />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Compétence' }), { target: { value: 'Maraîchage' } })
    fireEvent.click(screen.getByRole('button', { name: /^ajouter$/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/profil', expect.anything()))
    const corps = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(corps.competences).toEqual(['Excel', 'Maraîchage'])
  })

  it('refuse un doublon sans aller-retour serveur', async () => {
    const fetchMock = mockFetchOk()
    render(<SkillsCard competences={['Excel']} langues={[]} editable />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Compétence' }), { target: { value: 'excel' } })
    fireEvent.click(screen.getByRole('button', { name: /^ajouter$/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retire une compétence', async () => {
    const fetchMock = mockFetchOk()
    render(<SkillsCard competences={['Excel', 'Vente']} langues={[]} editable />)
    fireEvent.click(screen.getByRole('button', { name: /retirer excel/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const corps = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(corps.competences).toEqual(['Vente'])
  })
})

describe('GUIC-689 — SectionProfil n’édite plus ce qu’elle n’affiche pas', () => {
  it('ne porte plus les champs déplacés', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    const src = readFileSync(resolve(__dirname, '../../src/components/profil/SectionProfil.tsx'), 'utf-8')
    expect(src).not.toMatch(/domainesInteret/)
    expect(src).not.toMatch(/competences/)
  })
})
