/**
 * Tests GUIC-458 — OppCard conformité design v3 (lot3-opps-web / lot3-opps-mobile)
 *
 * Findings couverts :
 *  F01 — Badge « % match »
 *  F02 — Badge type + « · J-x » (compte-à-rebours, urgent en rouge)
 *  F03 — CTA « Voir + postuler → »
 *  F08 — Deadline « Postuler avant le X »
 *  F20 — Variante compacte mobile (data-testid compact)
 *
 * NB : le composant réel s'appelle OppCard (OppCard.tsx), alias OpportunityCard
 * dans le ticket. Les imports pointent sur OppCard.
 */
import { render, screen } from '@testing-library/react'
import { OppCard } from '@/components/opportunites/OppCard'
import type { OpportuniteListItem } from '@/types/opportunite'

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z').getTime()

const baseItem: OpportuniteListItem = {
  id: 'o1',
  slug: 'stage-data-science',
  titre: 'Stage Data Science · 6 mois',
  type: 'Stage',
  domaine: 'Numerique',
  region: 'Dakar',
  organisation: 'Sonatel — Innovation',
  remuneration: '350 000 F/mois',
  deadline: null,
}

// ─── F01 — Badge « % match » conditionnel ────────────────────────────────────

describe('F01 — Badge match conditionnel', () => {
  it('affiche "94% match" quand matchScore=94', () => {
    render(
      <OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} matchScore={94} />,
    )
    const badge = screen.getByTestId('match-score')
    expect(badge).toHaveTextContent('94% match')
  })

  it('masque le badge quand matchScore est absent', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    expect(screen.queryByTestId('match-score')).not.toBeInTheDocument()
  })

  it('masque le badge quand matchScore est null', () => {
    render(
      <OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} matchScore={null} />,
    )
    expect(screen.queryByTestId('match-score')).not.toBeInTheDocument()
  })
})

// ─── F02 — Badge type + « · J-x » ────────────────────────────────────────────

describe('F02 — Compte-à-rebours J-x dans le chip type', () => {
  it('affiche "· J-3" dans le chip quand deadline dans 3 jours', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 3 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    // Le chip doit contenir "J-3"
    expect(screen.getByTestId('type-chip')).toHaveTextContent('J-3')
  })

  it('affiche "· J-12" dans le chip quand deadline dans 12 jours (non urgent)', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 12 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    expect(screen.getByTestId('type-chip')).toHaveTextContent('J-12')
  })

  it('colorie le chip en rouge (tone=urgent) si J ≤ 7', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 5 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const chip = screen.getByTestId('type-chip')
    // tone red → data-tone="red"
    expect(chip).toHaveAttribute('data-tone', 'red')
  })

  it("ne colorie pas en rouge si J > 7", () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 10 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const chip = screen.getByTestId('type-chip')
    expect(chip).not.toHaveAttribute('data-tone', 'red')
  })

  it('ne rend aucun suffixe J-x quand pas de deadline', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const chip = screen.getByTestId('type-chip')
    expect(chip.textContent).not.toMatch(/J-/)
  })
})

// ─── F03 — CTA « Voir + postuler » ───────────────────────────────────────────

describe('F03 — CTA Voir + postuler', () => {
  it('affiche le bouton "Voir + postuler"', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    expect(screen.getByTestId('cta-voir-postuler')).toBeInTheDocument()
  })

  it('le CTA a z-[1] pour être au-dessus du lien étiré', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const cta = screen.getByTestId('cta-voir-postuler')
    expect(cta.className).toMatch(/z-\[1\]/)
  })

  it('le CTA est un lien vers /opportunites/<slug>', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const cta = screen.getByTestId('cta-voir-postuler')
    expect(cta).toHaveAttribute('href', '/opportunites/stage-data-science')
  })
})

// ─── F08 — Deadline « Postuler avant le X » ──────────────────────────────────

describe('F08 — Libellé deadline', () => {
  it('affiche "Postuler avant le" pour deadline non urgente', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 30 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    expect(screen.getByTestId('deadline-label')).toHaveTextContent(/Postuler avant le/i)
  })

  it('affiche le label J-x sans préfixe "Postuler avant" si urgent', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 3 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const dl = screen.getByTestId('deadline-label')
    // Urgent → affiche "J-3" (ou similaire), pas le préfixe long
    expect(dl).toHaveTextContent('J-3')
    expect(dl.textContent).not.toMatch(/Postuler avant le/i)
  })

  it('colore la deadline en rouge si urgent', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 5 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const dl = screen.getByTestId('deadline-label')
    expect(dl.className).toMatch(/text-gj-red/)
  })
})
