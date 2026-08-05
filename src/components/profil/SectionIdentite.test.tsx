import type { ComponentProps } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SectionIdentite } from './SectionIdentite'

type IdentiteData = ComponentProps<typeof SectionIdentite>['data']

/**
 * GUIC-445 — le formulaire d'édition de l'identité (mon-profil) doit être aligné
 * sur l'onboarding : commune = select filtré + « Autre », genre 3 options.
 */
const baseData: IdentiteData = {
  cjsUid: 'u-test-1',
  nom: 'Diop', prenom: 'Awa', email: 'awa@test.sn', telephone: null,
  region: 'Dakar', commune: null, genre: null, dateNaissance: null,
}

function renderEdit(data = baseData) {
  render(<SectionIdentite data={data} ssoProfilUrl={null} onSaved={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
}

describe('SectionIdentite — édition alignée onboarding (GUIC-445)', () => {
  it('la commune est un select (pas un input libre) avec une option « Autre »', () => {
    renderEdit()
    const commune = screen.getByLabelText('Commune') as HTMLSelectElement
    expect(commune.tagName).toBe('SELECT')
    const opts = within(commune).getAllByRole('option').map(o => o.textContent)
    expect(opts).toContain('Autre (préciser)')
  })

  it('le genre propose « Non précisé » (3 options)', () => {
    renderEdit()
    const genre = screen.getByLabelText('Genre') as HTMLSelectElement
    const opts = within(genre).getAllByRole('option').map(o => o.textContent)
    expect(opts).toEqual(expect.arrayContaining(['Femme', 'Homme', 'Non précisé']))
  })

  it('choisir « Autre » révèle un champ libre de commune', () => {
    renderEdit()
    const commune = screen.getByLabelText('Commune') as HTMLSelectElement
    fireEvent.change(commune, { target: { value: '__autre__' } })
    expect(screen.getByLabelText('Préciser la commune')).toBeInTheDocument()
  })

  it('commune désactivée sans région', () => {
    renderEdit({ ...baseData, region: null })
    expect(screen.getByLabelText('Commune')).toBeDisabled()
  })
})
