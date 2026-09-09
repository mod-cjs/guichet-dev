/**
 * @jest-environment jsdom
 *
 * GUIC-689 — La fiche ressource doit dire ce qu'elle sait.
 *
 * Constaté au rendu : la page n'affichait que le thème et un compteur de vues.
 * La maquette v5 attend cinq métadonnées — Format, Taille, Langue, Contenu,
 * Mis à jour.
 *
 * Trois existent réellement en base (type, langue, niveau, date de mise à
 * jour) ; deux n'existent pas du tout (taille du fichier, pagination). On
 * affiche les premières et on TAIT les secondes — pas de tiret, pas de
 * « non précisé » : une ligne vide se lit comme une donnée manquante alors
 * qu'elle est simplement hors modèle.
 */
import { render, screen } from '@testing-library/react'

import { RessourceMetadonnees } from '@/components/ressources/RessourceMetadonnees'

const base = {
  type: 'PDF' as const,
  langue: null,
  niveau: null,
  theme: 'Emploi',
  updatedAt: '2026-04-12T10:00:00.000Z',
}

describe('GUIC-689 — métadonnées réellement disponibles', () => {
  it('ne répète PAS le format — le hero porte déjà le badge de type', () => {
    render(<RessourceMetadonnees {...base} />)
    expect(screen.queryByText('Format')).toBeNull()
  })

  it('accepte `type` au contrat sans le rendre — l’appelant n’a pas à trier', () => {
    // Le champ reste dans les props pour que la page passe la ressource telle
    // quelle ; c'est le bloc qui décide de ne pas répéter le badge du hero.
    const { container } = render(<RessourceMetadonnees {...base} type="Video" />)
    expect(container.textContent).not.toMatch(/Video/)
  })

  it('affiche le thème', () => {
    render(<RessourceMetadonnees {...base} />)
    expect(screen.getByText('Thème')).toBeInTheDocument()
    expect(screen.getByText('Emploi')).toBeInTheDocument()
  })

  it('affiche la langue quand elle est renseignée', () => {
    render(<RessourceMetadonnees {...base} langue="Wolof" />)
    expect(screen.getByText('Langue')).toBeInTheDocument()
    expect(screen.getByText('Wolof')).toBeInTheDocument()
  })

  it('affiche le niveau quand il est renseigné', () => {
    render(<RessourceMetadonnees {...base} niveau="Debutant" />)
    expect(screen.getByText('Niveau')).toBeInTheDocument()
    expect(screen.getByText('Débutant')).toBeInTheDocument()
  })

  it('affiche la date de mise à jour en clair', () => {
    render(<RessourceMetadonnees {...base} />)
    expect(screen.getByText(/Mis à jour/)).toBeInTheDocument()
    expect(screen.getByText(/avril 2026/i)).toBeInTheDocument()
  })
})

describe('GUIC-689 — ce qui n’existe pas ne s’affiche pas', () => {
  it('une langue absente ne produit NI ligne NI tiret', () => {
    const { container } = render(<RessourceMetadonnees {...base} langue={null} />)
    expect(screen.queryByText('Langue')).toBeNull()
    expect(container.textContent).not.toMatch(/—/)
  })

  it('un niveau absent ne produit pas de ligne', () => {
    render(<RessourceMetadonnees {...base} niveau={null} />)
    expect(screen.queryByText('Niveau')).toBeNull()
  })

  it('aucune mention de taille ni de pagination — hors modèle', () => {
    // La v5 les demande, la base ne les porte pas. Les afficher vides
    // laisserait croire à une donnée manquante plutôt qu'inexistante.
    const { container } = render(<RessourceMetadonnees {...base} />)
    expect(container.textContent).not.toMatch(/Taille|Poids|pages?/i)
  })
})
