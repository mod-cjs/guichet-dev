/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Le titre d'une carte ressource doit disposer de la ligne entière.
 *
 * Mesuré au rendu dans les étagères de l'accueil : carte de 280px, ligne
 * disponible 178px, titre 128px — tronqué sur 4 des 5 premières ressources.
 * Les 50px manquants partaient dans le badge de type, posé sur la ligne du
 * titre. Or le type est DÉJÀ porté deux fois : par l'icône colorée à gauche
 * (play/bleu pour une vidéo) et par le verbe du CTA ("Regarder", "Télécharger").
 *
 * Le badge n'est pas supprimé — il descend sur la ligne méta, où la place est
 * libre. On garde l'information, on rend la ligne au titre.
 */
import { render, screen } from '@testing-library/react'

import { ResourceCard } from '@/components/ressources/ResourceCard'

const item = {
  id: 'r1',
  titre: 'Wolof professionnel — vocabulaire de l\'entretien',
  description: 'Un guide.',
  type: 'Video' as const,
  theme: 'Emploi',
  url: 'https://example.org/v',
  vues: 0,
  niveau: null,
  langue: null,
  categorie: null,
  createdAt: '2026-04-01T10:00:00.000Z',
}

describe('GUIC-689 — place du titre dans la carte ressource', () => {
  it('ne pose PAS le badge de type sur la ligne du titre', () => {
    render(<ResourceCard item={item} />)
    const titre = screen.getByRole('heading', { name: /Wolof professionnel/ })
    const badge = screen.getByText('Video')

    expect(titre.parentElement?.contains(badge)).toBe(false)
  })

  it("conserve le type visible ailleurs dans la carte", () => {
    render(<ResourceCard item={item} />)
    // Retirer le badge de la ligne du titre ne doit pas retirer l'information.
    expect(screen.getByText('Video')).toBeInTheDocument()
  })
})
