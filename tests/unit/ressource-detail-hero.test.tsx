/**
 * GUIC-689 — <RessourceDetailHero /> : inclusion native Wolof (design v5).
 *
 * Réf. design v4 `resources-web.jsx:259-268` : quand `detail.langue ===
 * 'Wolof'`, un bandeau dédié (teal-soft/teal-deep + icône play) remplace le
 * badge grey générique. Les autres langues gardent le badge grey standard.
 */
import { render, screen } from '@testing-library/react'
import { RessourceDetailHero } from '@/components/ressources/RessourceDetailHero'
import type { RessourceDetail } from '@/lib/loaders/ressources'

const baseDetail: RessourceDetail = {
  id: 'r-1',
  titre: 'Guide entrepreneuriat',
  description: '<p>Description</p>',
  type: 'PDF',
  theme: 'Entrepreneuriat',
  url: 'https://example.com/guide.pdf',
  vues: 12,
  niveau: 'Debutant',
  langue: 'FR',
  categorie: 'Formation',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  // GUIC-709 — mesures de la fiche. `poidsOctets: null` = non relevé, ce qui
  // est l'état par défaut d'une fixture qui ne parle pas de poids.
  telechargements: 0,
  poidsOctets: null,
}

describe('<RessourceDetailHero /> — inclusion Wolof', () => {
  it('langue Wolof : affiche le bandeau « Version audio en Wolof disponible »', () => {
    const { container } = render(<RessourceDetailHero detail={{ ...baseDetail, langue: 'Wolof' }} />)
    expect(screen.getByText('Version audio en Wolof disponible')).toBeInTheDocument()
    // Plus de badge grey générique portant exactement "Wolof".
    expect(screen.queryByText('Wolof', { exact: true })).toBeNull()
    // Icône du bandeau : sprite "play" (réf resources-web.jsx:261, #i-play).
    expect(container.querySelector('svg use[href="/icons.svg#i-play"]')).not.toBeNull()
  })

  it('langue FR : garde le badge grey simple, pas de bandeau audio', () => {
    render(<RessourceDetailHero detail={{ ...baseDetail, langue: 'FR' }} />)
    expect(screen.getByText('FR', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText(/Version audio en Wolof disponible/)).toBeNull()
  })
})
