/**
 * @jest-environment jsdom
 *
 * Tests <ProfilClient /> (GUIC-191) — rendu des sections clés et de la MyCard.
 */
import { render, screen } from '@testing-library/react'
import { ProfilClient } from '@/components/profil/ProfilClient'
import type { ProfilComplet } from '@/types/profil'

const PROFIL: ProfilComplet = {
  cjsUid:        'abc-12345-XYZ09',
  nom:           'Diop',
  prenom:        'Awa',
  email:         'awa@example.sn',
  telephone:     '+221770000000',
  region:        'Dakar',
  commune:       'Plateau',
  genre:         'F',
  dateNaissance: '2000-01-01',
  profil: {
    id:                'p1',
    biographie:        null,
    niveauEtude:       null,
    situationEmploi:   null,
    domainesInteret:   [],
    competences:       [],
    completionScore:   42,
    profileVisibility: 'prive',
  },
  experiences: [],
  diplomes:    [],
  certificats: [],
}

describe('<ProfilClient />', () => {
  it('rend le titre Mon profil et la MyCard CJS avec identifiant', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    expect(screen.getByRole('heading', { level: 1, name: /Mon profil/i })).toBeInTheDocument()
    expect(screen.getByTestId('mycard')).toBeInTheDocument()
    expect(screen.getByTestId('mycard-id').textContent).toMatch(/^GJS · AD · /)
  })

  it('rend les sections Identité, Profil, Expériences, Diplômes, Certificats', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    // Headings de section (h2)
    expect(screen.getByRole('heading', { level: 2, name: /Identité/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^Profil$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Expériences/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Diplômes/i })).toBeInTheDocument()
    // SectionCertificats ne rend rien quand la liste est vide — testé séparément.
  })

  it('rend la section Certificats Moodle quand la liste contient des items', () => {
    const withCert: ProfilComplet = {
      ...PROFIL,
      certificats: [
        { id: 'c1', formation: 'Cours JS', obtenuLe: '2025-01-15', urlCertificat: null },
      ],
    }
    render(<ProfilClient initial={withCert} ssoProfilUrl={null} />)
    expect(screen.getByRole('heading', { level: 2, name: /Certificats/i })).toBeInTheDocument()
  })

  it('affiche le score de complétion fourni dans le profil', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    // Score 42 — la CompletionBar affiche "42%" (cf CompletionBar.tsx)
    expect(screen.getByText(/42\s*%/)).toBeInTheDocument()
  })
})
