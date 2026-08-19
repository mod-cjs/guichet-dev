/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Un titre de ressource ne doit pas être amputé.
 *
 * Après avoir rendu la ligne entière au titre (178px au lieu de 128), deux
 * ressources sur cinq restaient tronquées dans les étagères : les titres du
 * fonds vont jusqu'à 47 caractères (« Réussir son premier emploi — témoignage
 * Sonatel »), et deux lignes n'en tiennent qu'environ 36.
 *
 * Le titre est ce qui permet de choisir. L'amputer pour économiser une ligne
 * fait payer la mise en page par la seule information qui décide du clic.
 *
 * La preuve réelle est au rendu (aucun `h3` tronqué sur le fonds complet) ;
 * ce test tient la borne côté code pour empêcher un retour à deux lignes.
 */
import { render, screen } from '@testing-library/react'

import { ResourceCard } from '@/components/ressources/ResourceCard'

const item = {
  id: 'r1',
  titre: 'Réussir son premier emploi — témoignage Sonatel',
  description: 'Un témoignage.',
  type: 'Video' as const,
  theme: 'Emploi',
  url: 'https://example.org/v',
  vues: 0,
  niveau: null,
  langue: null,
  categorie: null,
  createdAt: '2026-04-01T10:00:00.000Z',
}

describe('GUIC-689 — nombre de lignes du titre', () => {
  it('laisse trois lignes au titre, pas deux', () => {
    render(<ResourceCard item={item} />)
    const titre = screen.getByRole('heading', { name: /Réussir son premier emploi/ })

    expect(titre.className).toMatch(/line-clamp-3/)
    expect(titre.className).not.toMatch(/line-clamp-2\b/)
  })

  it('affiche le titre en entier dans le DOM, quelle que soit la coupe visuelle', () => {
    render(<ResourceCard item={item} />)
    // Une coupe CSS garde le texte lisible aux lecteurs d'écran ; une coupe
    // par troncature de chaîne le perdrait pour de bon.
    expect(screen.getByRole('heading')).toHaveTextContent(item.titre)
  })
})

/**
 * GUIC-689 — Conséquence de la troisième ligne : les cartes d'une même
 * étagère n'ont plus la même hauteur de contenu.
 *
 * Mesuré au rendu : les `li` font tous 200px (le flex les étire), mais les
 * cartes à l'intérieur vont de 153 à 200. Le bas de l'étagère devient
 * irrégulier, et une carte plus courte semble tronquée alors qu'elle est
 * simplement plus brève. La carte doit remplir son emplacement.
 */
describe('GUIC-689 — la carte remplit son emplacement', () => {
  it('occupe toute la hauteur que la grille lui donne', () => {
    const { container } = render(<ResourceCard item={item} />)
    const carte = container.firstElementChild as HTMLElement
    expect(carte.className).toMatch(/h-full/)
  })
})
