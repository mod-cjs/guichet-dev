/**
 * Tests unitaires <CandidatureDetail /> (GUIC-689 — code couleur catégories +
 * ergonomie v5, findings A/B/D). Le composant page (intégration, loader/auth)
 * est déjà couvert par tests/integration/candidature-detail-page.test.tsx.
 */
import { render, screen } from '@testing-library/react'
import { CandidatureDetail } from '@/components/candidatures/CandidatureDetail'
import type { CandidatureDetailDTO } from '@/lib/candidature-detail-loader'

function make(over: Partial<CandidatureDetailDTO> = {}): CandidatureDetailDTO {
  return {
    id: 'cand-1',
    statut: 'En_attente',
    lettreMotivation: 'Voici ma motivation',
    cvUrl: 'https://cdn/cv.pdf',
    soumiseA: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-02T11:00:00.000Z',
    opportunite: {
      slug: 'stage-data',
      titre: 'Stage Data — Sonatel',
      organisation: 'Sonatel',
      deadline: '2026-06-30T23:59:59.000Z',
      type: 'Stage',
      domaine: 'Numerique',
      description: 'Mission analytics…',
    },
    ...over,
  }
}

describe('<CandidatureDetail /> — badge type par catégorie (GUIC-689, finding A)', () => {
  it('rend le chip OpportuniteTypeChip (data-cat) au lieu du Tag teal par défaut', () => {
    const { container } = render(
      <CandidatureDetail candidature={make({ opportunite: { ...make().opportunite, type: 'Formation' } })} />,
    )
    const chip = container.querySelector('[data-cat="cat-formation"]')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveTextContent('Formation')
  })
})

describe('<CandidatureDetail /> — tuile héros par catégorie (GUIC-689, finding B)', () => {
  it("la tuile héros est colorée par la catégorie du type (pas bg-gj-teal-soft en dur)", () => {
    render(
      <CandidatureDetail candidature={make({ opportunite: { ...make().opportunite, type: 'Bourse' } })} />,
    )
    const tile = screen.getByTestId('detail-hero-tile')
    expect(tile.className).toMatch(/bg-cat-financement\b/)
    expect(tile.className).not.toMatch(/bg-gj-teal-soft/)
  })

  it('deux types différents produisent des tuiles de couleur différente', () => {
    const { rerender } = render(
      <CandidatureDetail candidature={make({ opportunite: { ...make().opportunite, type: 'Emploi' } })} />,
    )
    const tileEmploi = screen.getByTestId('detail-hero-tile').className
    rerender(
      <CandidatureDetail candidature={make({ opportunite: { ...make().opportunite, type: 'Volontariat' } })} />,
    )
    const tileVolontariat = screen.getByTestId('detail-hero-tile').className
    expect(tileEmploi).not.toBe(tileVolontariat)
  })
})

describe('<CandidatureDetail /> — cibles tactiles CTA (GUIC-689, finding D)', () => {
  it('le CTA "Voir l\'opportunité" respecte le tap-min (44px)', () => {
    render(<CandidatureDetail candidature={make()} />)
    const cta = screen.getByTestId('detail-cta-opportunite')
    expect(cta.className).toMatch(/min-h-\[var\(--tap-min\)\]/)
  })
})

describe('<CandidatureDetail /> — pas de CTA retrait mensonger (GUIC-689, finding A3)', () => {
  it('ne rend aucun bouton "Retirer ma candidature" (feature inexistante : ni route ni statut Retiree)', () => {
    render(<CandidatureDetail candidature={make({ statut: 'En_attente' })} />)
    expect(screen.queryByTestId('detail-cta-withdraw')).not.toBeInTheDocument()
    expect(screen.queryByText(/Retirer ma candidature/i)).not.toBeInTheDocument()
  })
})
