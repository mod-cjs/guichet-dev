/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Cartes « Objectif & secteurs visés » et « Compétences & langues »
 * (réf `profil-web.jsx`, `ObjectiveCard` L.505-544 et `SkillsCard` L.546-565).
 *
 * Les champs ont été créés pour l'occasion (migration
 * `profil_v5_objectif_langues_engagements_matricule`). Règle R3 du standard :
 * un bloc dont la donnée manque ne s'affiche pas — il ne montre ni titre orphelin
 * ni tiret de remplissage.
 */
import { render, screen, within } from '@testing-library/react'

import { ObjectiveCard } from '@/components/profil/ObjectiveCard'
import { SkillsCard } from '@/components/profil/SkillsCard'

const OBJECTIF_PLEIN = {
  objectif: 'Lancer une micro-entreprise de maraîchage.',
  secteurs: ['Agriculture', 'Entrepreneuriat'],
  typesRecherches: ['financement', 'formation'],
  regionsMobilite: ['Tambacounda', 'Kedougou'],
}

describe('GUIC-689 — Objectif & secteurs visés', () => {
  it('rend les quatre blocs quand tout est renseigné', () => {
    render(<ObjectiveCard {...OBJECTIF_PLEIN} />)
    const carte = screen.getByRole('region', { name: /objectif & secteurs visés/i })
    expect(carte.textContent).toMatch(/micro-entreprise de maraîchage/)
    expect(carte.textContent).toMatch(/Agriculture/)
    expect(carte.textContent).toMatch(/Formation/i)
    expect(carte.textContent).toMatch(/Tambacounda/)
  })

  it('traduit les régions en libellé lisible', () => {
    render(<ObjectiveCard {...OBJECTIF_PLEIN} regionsMobilite={['Thies', 'Saint_Louis']} />)
    const carte = screen.getByRole('region', { name: /objectif & secteurs visés/i })
    expect(carte.textContent).toMatch(/Thiès/)
    expect(carte.textContent).toMatch(/Saint-Louis/)
    expect(carte.textContent).not.toMatch(/Saint_Louis/)
  })

  it('omet un bloc dont la donnée manque, sans titre orphelin', () => {
    render(<ObjectiveCard objectif={null} secteurs={[]} typesRecherches={[]} regionsMobilite={[]} />)
    const carte = screen.getByRole('region', { name: /objectif & secteurs visés/i })
    expect(carte.textContent).not.toMatch(/mon objectif/i)
    expect(carte.textContent).not.toMatch(/secteurs visés/i)
    expect(carte.textContent).not.toMatch(/mobilité/i)
    expect(carte.textContent).not.toMatch(/—/)
  })

  it('invite à renseigner plutôt que d’afficher une carte muette', () => {
    render(<ObjectiveCard objectif={null} secteurs={[]} typesRecherches={[]} regionsMobilite={[]} />)
    expect(screen.getByTestId('objectif-vide')).toBeInTheDocument()
  })
})

describe('GUIC-689 — Compétences & langues', () => {
  const LANGUES = [
    { id: 'l1', langue: 'Wolof', niveau: 'maternelle' as const },
    { id: 'l2', langue: 'Français', niveau: 'courant' as const },
    { id: 'l3', langue: 'Anglais', niveau: 'notions' as const },
  ]

  it('rend les compétences en chips', () => {
    render(<SkillsCard competences={['Maraîchage', 'Comptabilité']} langues={[]} />)
    const carte = screen.getByRole('region', { name: /compétences & langues/i })
    expect(carte.textContent).toMatch(/Maraîchage/)
    expect(carte.textContent).toMatch(/Comptabilité/)
  })

  it('rend chaque langue avec son niveau en toutes lettres', () => {
    render(<SkillsCard competences={[]} langues={LANGUES} />)
    const liste = screen.getByTestId('langues-liste')
    expect(within(liste).getAllByRole('listitem')).toHaveLength(3)
    expect(liste.textContent).toMatch(/Langue maternelle/i)
    expect(liste.textContent).toMatch(/Courant/i)
    expect(liste.textContent).toMatch(/Notions/i)
  })

  it('la barre de niveau ne remplace pas le libellé — elle l’accompagne', () => {
    render(<SkillsCard competences={[]} langues={LANGUES} />)
    const liste = screen.getByTestId('langues-liste')
    // Une barre seule serait illisible pour un lecteur d'écran : le niveau doit
    // rester du texte.
    liste.querySelectorAll('[role="progressbar"]').forEach((b) => {
      expect(b.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('omet un bloc vide, sans titre orphelin', () => {
    render(<SkillsCard competences={['Excel']} langues={[]} />)
    const carte = screen.getByRole('region', { name: /compétences & langues/i })
    expect(carte.textContent).not.toMatch(/langues/i)
  })

  it('invite à renseigner quand tout est vide', () => {
    render(<SkillsCard competences={[]} langues={[]} />)
    expect(screen.getByTestId('competences-vide')).toBeInTheDocument()
  })
})
