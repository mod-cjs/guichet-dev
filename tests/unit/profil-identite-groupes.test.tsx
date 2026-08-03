/**
 * @jest-environment jsdom
 *
 * GUIC-689 (É-17) — Identité : regroupement par section + « Voir plus ».
 *
 * Action P1 de l'audit UX (Lot 4), citée nommément : « Identité & contact :
 * 9 champs d'un bloc — grouper par icônes de section, secondaire derrière
 * "Voir plus" ». Le Lot 14 ne fournit AUCUN patron pour ce regroupement (le
 * JSX v5 reste lui-même en grille plate) : il est conçu ici.
 *
 * Découpage retenu : Contact (nom, e-mail, téléphone) · Localisation (région,
 * commune) toujours visibles ; État civil (genre, date de naissance) replié
 * derrière « Voir plus » — ce sont les champs les moins consultés et les plus
 * sensibles.
 *
 * ⚠️ Le formulaire d'édition (branche `editing`) n'est PAS touché : la
 * sauvegarde du profil doit continuer de fonctionner à l'identique.
 */
import { render, screen, fireEvent } from '@testing-library/react'

import { SectionIdentite } from '@/components/profil/SectionIdentite'
import type { ProfilComplet } from '@/types/profil'

const DATA = {
  cjsUid: 'u-1',
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa@cjs.sn',
  telephone: '+221770000000',
  region: 'Thies',
  commune: 'Mbour',
  genre: 'F',
  dateNaissance: '2002-04-11',
  profil: null,
  experiences: [],
  diplomes: [],
  certificats: [],
} as unknown as ProfilComplet

function renderSection() {
  return render(
    <SectionIdentite
      data={DATA}
      photoUrl={null}
      ssoProfilUrl={null}
      onSaved={() => {}}
      onPhotoSaved={() => {}}
    />,
  )
}

describe('GUIC-689 — identité regroupée par section', () => {
  it('groupe les champs sous des intitulés de section', () => {
    renderSection()
    expect(screen.getByText(/^contact$/i)).toBeInTheDocument()
    expect(screen.getByText(/^localisation$/i)).toBeInTheDocument()
  })

  it('les champs principaux restent visibles sans interaction', () => {
    renderSection()
    expect(screen.getByText('awa@cjs.sn')).toBeInTheDocument()
    expect(screen.getByText('Mbour')).toBeInTheDocument()
  })

  it('les champs secondaires sont repliés par défaut', () => {
    renderSection()
    expect(screen.queryByText(/date de naissance/i)).not.toBeInTheDocument()
  })

  it('« Voir plus » révèle les champs secondaires et est accessible', () => {
    renderSection()
    const bouton = screen.getByRole('button', { name: /voir plus/i })
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(bouton)
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/date de naissance/i)).toBeInTheDocument()
    expect(screen.getByText('Femme')).toBeInTheDocument()
  })

  it('un champ vide affiche un tiret (invite à compléter son propre profil)', () => {
    render(
      <SectionIdentite
        data={{ ...DATA, telephone: null } as unknown as ProfilComplet}
        photoUrl={null}
        ssoProfilUrl={null}
        onSaved={() => {}}
        onPhotoSaved={() => {}}
      />,
    )
    const contact = screen.getByText(/^contact$/i).closest('section')
    expect(contact?.textContent).toContain('—')
  })

  it('le bouton se referme et pilote une région identifiée', () => {
    renderSection()
    const bouton = screen.getByRole('button', { name: /voir plus/i })
    const cible = bouton.getAttribute('aria-controls')
    expect(cible).toBeTruthy()
    fireEvent.click(bouton)
    expect(document.getElementById(cible!)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /voir moins/i }))
    expect(screen.queryByText(/date de naissance/i)).not.toBeInTheDocument()
  })
})

describe('GUIC-689 — encart d’incitation CV', () => {
  it('apparaît quand aucun CV n’est déposé, sans chiffre inventé', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SectionCv } = require('@/components/profil/SectionCv')
    render(<SectionCv initialCvUrl={null} />)
    const nudge = screen.getByTestId('cv-nudge')
    expect(nudge).toBeInTheDocument()
    // Le poids exact du CV dans le score n'est pas exposé : aucun « +N % ».
    expect(nudge.textContent).not.toMatch(/\+\s*\d+\s*%/)
  })

  it('disparaît dès qu’un CV existe', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SectionCv } = require('@/components/profil/SectionCv')
    render(<SectionCv initialCvUrl="https://blob/cv.pdf" />)
    expect(screen.queryByTestId('cv-nudge')).not.toBeInTheDocument()
  })
})
