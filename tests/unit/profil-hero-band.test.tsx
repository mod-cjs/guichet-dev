/**
 * @jest-environment jsdom
 *
 * GUIC-689 (É-17) — Profil : bandeau hero pleine largeur + grille v5.
 *
 * Structure actuelle inversée par rapport à la maquette (`profil-web.jsx`
 * `ProfileHeader` L.116-173 + `WebProfile` L.719-757) :
 *  - un `PageHeader` texte plat au lieu d'un bandeau d'identité ;
 *  - l'aside (carte CJS + complétion) à GAUCHE et le contenu éditable à droite,
 *    alors que la v5 met le contenu en colonne principale et l'aside à droite.
 *
 * Règle R3 du standard qualité : une pastille meta n'apparaît que si sa donnée
 * existe — jamais de « null », jamais de champ vide.
 */
import { render, screen, within } from '@testing-library/react'

import { ProfileHeroBand } from '@/components/profil/ProfileHeroBand'

const BASE = {
  prenom: 'Awa',
  nom: 'Ndiaye',
  cjsUid: 'u-1',
  photoUrl: null,
  completionScore: 45,
  region: 'Thies',
  dateNaissance: '2002-04-11',
  genre: 'F',
  niveauEtude: 'BAC_PLUS_2',
  membreDepuis: '2026-01-15',
}

describe('GUIC-689 — bandeau hero du profil', () => {
  it('affiche l’identité et le badge membre', () => {
    render(<ProfileHeroBand {...BASE} />)
    const band = screen.getByTestId('profil-hero-band')
    expect(within(band).getByText(/Awa Ndiaye/)).toBeInTheDocument()
    expect(within(band).getByText(/membre cjs/i)).toBeInTheDocument()
  })

  it('rend les pastilles meta disponibles', () => {
    render(<ProfileHeroBand {...BASE} />)
    const metas = screen.getByTestId('profil-hero-metas')
    expect(metas.textContent).toMatch(/Thiès/)
    expect(metas.textContent).toMatch(/ans/)
  })

  it('omet toute pastille dont la donnée manque (jamais de champ vide)', () => {
    render(
      <ProfileHeroBand
        {...BASE}
        region={null}
        dateNaissance={null}
        genre={null}
        niveauEtude={null}
        membreDepuis={null}
      />,
    )
    const metas = screen.queryByTestId('profil-hero-metas')
    expect(metas?.textContent ?? '').not.toMatch(/null|undefined|—\s*—/)
    // identité toujours présente même sans aucune meta
    expect(screen.getByTestId('profil-hero-band').textContent).toMatch(/Awa Ndiaye/)
  })

  it('porte une action unique « Modifier mon profil »', () => {
    render(<ProfileHeroBand {...BASE} />)
    const band = screen.getByTestId('profil-hero-band')
    expect(within(band).getByRole('link', { name: /modifier mon profil/i })).toBeInTheDocument()
  })

  it('aucun texte sous le plancher de 11px', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    const src = readFileSync(
      resolve(__dirname, '../../src/components/profil/ProfileHeroBand.tsx'),
      'utf-8',
    )
    const tailles = [
      ...[...src.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1])),
      ...[...src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => parseFloat(m[1])),
    ]
    expect(tailles.filter((t) => t < 11)).toEqual([])
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

/**
 * GUIC-689 — Finitions du bandeau, écarts 14 à 17 relevés contre
 * `profil-web.jsx` (`ProfileHeader` L.116-173).
 *
 * Aucun ne casse une fonctionnalité ; ensemble ils font la différence entre un
 * écran qui « ressemble à peu près » à la maquette et un écran conforme.
 */
describe('GUIC-689 — finitions du bandeau hero', () => {
  it('le badge « Membre CJS » porte son icône de validation', () => {
    render(<ProfileHeroBand {...BASE} />)
    const badge = screen.getByText(/membre cjs/i).closest('span')
    expect(badge?.querySelector('svg')).toBeTruthy()
  })

  it('les icônes des pastilles meta sont en ambre, jamais héritées du blanc', () => {
    render(<ProfileHeroBand {...BASE} />)
    const metas = screen.getByTestId('profil-hero-metas')
    const icones = metas.querySelectorAll('svg')
    expect(icones.length).toBeGreaterThan(0)
    icones.forEach((i) => expect(i.getAttribute('class') ?? '').toMatch(/text-gj-yellow/))
  })

  it('l’avatar porte l’anneau clair de la maquette', () => {
    render(<ProfileHeroBand {...BASE} />)
    const avatar = screen.getByTestId('profil-hero-avatar')
    expect(avatar.className).toMatch(/ring-/)
  })

  it('un bouton de changement de photo est posé sur l’avatar', () => {
    render(<ProfileHeroBand {...BASE} />)
    const bouton = screen.getByRole('link', { name: /changer la photo/i })
    expect(bouton).toHaveAttribute('href', '#profil-identite')
  })
})
