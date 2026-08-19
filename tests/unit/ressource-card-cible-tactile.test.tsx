/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Le bouton favori des cartes doit être atteignable au doigt.
 *
 * Mesuré au rendu : **32 × 32 px**, alors que le projet impose 44 px
 * (`--tap-min`, iOS HIG). Sur mobile, on le rate — et un bouton qu'on rate se
 * signale comme un bouton qui ne marche pas.
 *
 * Le cercle visible reste petit à dessein : c'est une action secondaire posée
 * sur une carte. C'est la ZONE CLIQUABLE qui doit grandir, pas le dessin.
 */
import { render, screen } from '@testing-library/react'

import { ResourceCard } from '@/components/ressources/ResourceCard'

const item = {
  id: 'r1',
  titre: 'Guide de candidature',
  description: 'Un guide.',
  type: 'PDF' as const,
  theme: 'Emploi',
  url: 'https://example.org/g.pdf',
  vues: 0,
  niveau: null,
  langue: null,
  categorie: null,
  createdAt: '2026-04-01T10:00:00.000Z',
}

describe('GUIC-689 — cible tactile du bouton favori', () => {
  it('porte une zone cliquable de 44px autour d\'un cercle resté à 32px', () => {
    render(<ResourceCard item={item} onToggleFavori={() => {}} />)
    const btn = screen.getByTestId('ressource-favori-btn')

    // Le bouton lui-même fait 44px : c'est lui qui reçoit le clic.
    expect(btn.className).toMatch(/min-w-\[var\(--tap-min\)\]/)
    expect(btn.className).toMatch(/min-h-\[var\(--tap-min\)\]/)

    // Le cercle dessiné reste à 32px, dans un `span` décoratif interne.
    const cercle = btn.querySelector('span[aria-hidden]')
    expect(cercle?.className).toMatch(/w-\[32px\]/)

    // Régression interdite : une variante étendait la zone par débordement
    // (`after:-inset`). Mesurée au rendu, elle était rognée à droite —
    // cliquable au-dessus du cercle, pas à côté. Une cible tactile asymétrique
    // est pire qu'une petite : elle est imprévisible.
    expect(btn.className).not.toMatch(/after:-inset/)
  })

  it('garde un libellé accessible explicite', () => {
    render(<ResourceCard item={item} onToggleFavori={() => {}} />)
    // Le bouton n'a qu'une icône : sans nom accessible, il est muet au lecteur
    // d'écran comme à la navigation vocale.
    expect(screen.getByRole('button', { name: /favoris/i })).toBeInTheDocument()
  })
})
