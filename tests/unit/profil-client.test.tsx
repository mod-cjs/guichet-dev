/**
 * @jest-environment jsdom
 *
 * Tests <ProfilClient /> (GUIC-191) — rendu des sections clés et de la MyCard.
 */
import { render, screen } from '@testing-library/react'
import { etatCompletion } from '@/lib/profil-score'
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
    photoUrl:          null,
    biographie:        null,
    niveauEtude:       null,
    situationEmploi:   null,
    situationHandicap: null,
    zoneHabitation:    null,
    domainesInteret:   [],
    competences:       [],
    completionScore:   42,
    profileVisibility: 'prive',
    cvUrl:             null,
    cvUploadedAt:      null,
    objectif:          null,
    typesRecherches:   [],
    regionsMobilite:   [],
  },
  experiences: [],
  diplomes:    [],
  certificats: [],
  langues:     [],
  engagements: [],
}

describe('<ProfilClient />', () => {
  it('rend l’identité dans le bandeau hero', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    expect(screen.getByRole('heading', { level: 1, name: /Awa Diop/i })).toBeInTheDocument()
  })

  /**
   * GUIC-689 — La carte CJS a quitté le profil. La maquette v5
   * (`profil-web.jsx` L.746-749) réserve l'aside à la complétion et aux
   * documents ; la carte a son propre écran (`/jeune/ma-carte`).
   *
   * Elle affichait en outre un matricule FABRIQUÉ — « GJS · <initiales> ·
   * <6 caractères de l'UUID » — qui n'existe nulle part en base, et un
   * « membre depuis » figé sur un tiret.
   */
  it('n’affiche plus la carte CJS ni son matricule fabriqué', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    expect(screen.queryByText(/^GJS · AD · /)).not.toBeInTheDocument()
    expect(screen.queryByText(/carte cjs/i)).not.toBeInTheDocument()
  })

  it('l’aside porte la checklist de complétion', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    expect(screen.getByRole('region', { name: /complétion du profil/i })).toBeInTheDocument()
    expect(screen.getByTestId('completion-etapes')).toBeInTheDocument()
  })

  it('rend les sections Identité, Profil, Expériences, Diplômes, Certificats', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    // Headings de section (h2)
    expect(screen.getByRole('heading', { level: 2, name: /Identité/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^Profil$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Expériences/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Diplômes/i })).toBeInTheDocument()
    // GUIC-365 : SectionCertificats est toujours rendue (créa manuelle possible),
    // même quand la liste est vide.
    expect(screen.getByRole('heading', { level: 2, name: /Certifications/i })).toBeInTheDocument()
  })

  it('rend la section Certificats quand la liste contient des items', () => {
    const withCert: ProfilComplet = {
      ...PROFIL,
      certificats: [
        { id: 'c1', formation: 'Cours JS', obtenuLe: '2025-01-15', urlCertificat: null, fichierUrl: null },
      ],
    }
    render(<ProfilClient initial={withCert} ssoProfilUrl={null} />)
    expect(screen.getByRole('heading', { level: 2, name: /Certifications/i })).toBeInTheDocument()
  })

  /**
   * GUIC-689 — Le hero affichait le score PERSISTÉ (`profil.completionScore`,
   * recalculé seulement à l'enregistrement) pendant que la checklist recalculait
   * depuis les données courantes : l'écran montrait « 0 % » d'un côté et
   * « 5 % » de l'autre. Une seule valeur circule désormais.
   */
  it('hero et checklist affichent le MÊME score, dérivé des données courantes', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    const attendu = etatCompletion(
      {
        region:        PROFIL.region,
        commune:       PROFIL.commune,
        genre:         PROFIL.genre,
        dateNaissance: PROFIL.dateNaissance,
      },
      PROFIL.profil
        ? {
            biographie:      PROFIL.profil.biographie,
            niveauEtude:     PROFIL.profil.niveauEtude,
            situationEmploi: PROFIL.profil.situationEmploi,
            domainesInteret: PROFIL.profil.domainesInteret,
            competences:     PROFIL.profil.competences,
          }
        : null,
      PROFIL.experiences.length,
      PROFIL.diplomes.length,
    ).score

    expect(screen.getByTestId('completion-score')).toHaveTextContent(`${attendu}`)
    const barre = screen.getByRole('progressbar', { name: /progression du profil/i })
    expect(barre).toHaveAttribute('aria-valuenow', String(attendu))
  })

  // GUIC-581 — entrée mobile vers la page Inclusion & accessibilité
  // (le desktop passe par la sidebar ; la ligne est masquée en lg via CSS).
  it('rend le lien mobile Inclusion & accessibilité → /jeune/accessibilite', () => {
    render(<ProfilClient initial={PROFIL} ssoProfilUrl={null} />)
    const link = screen.getByRole('link', { name: /inclusion & accessibilité/i })
    expect(link).toHaveAttribute('href', '/jeune/accessibilite')
    expect(link.className).toMatch(/lg:hidden/)
    expect(link).toHaveTextContent(/adapter l.application à tes besoins/i)
  })
})
