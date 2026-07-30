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

// ─── F02 — Chip catégorie + pastille urgence séparée (GUIC-689) ──────────────

describe('F02 — Chip catégorie (seul) + pastille urgence séparée', () => {
  it('le chip type porte la famille catégorie (Stage → cat-stage), plus aucun suffixe J-x', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const chip = screen.getByTestId('type-chip')
    expect(chip).toHaveAttribute('data-cat', 'cat-stage')
    expect(chip.textContent).not.toMatch(/J-/)
  })

  it('affiche une pastille d’urgence « J-3 » quand la deadline est dans 3 jours', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 3 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const pastille = screen.getByTestId('urgence-badge')
    expect(pastille).toHaveTextContent('J-3')
    expect(pastille.className).toMatch(/gj-urgent/)
  })

  it('n’affiche aucune pastille d’urgence quand la deadline est dans 12 jours (non urgent)', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 12 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    expect(screen.queryByTestId('urgence-badge')).not.toBeInTheDocument()
  })

  it('n’affiche aucune pastille d’urgence quand pas de deadline', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    expect(screen.queryByTestId('urgence-badge')).not.toBeInTheDocument()
  })
})

// ─── F03 — CTA secondaire « Voir l'offre » (GUIC-689) ────────────────────────

describe('F03 — CTA secondaire « Voir l’offre »', () => {
  it('affiche le libellé "Voir l\'offre" (plus "postuler" en rangée de liste)', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const cta = screen.getByTestId('cta-voir-postuler')
    expect(cta).toHaveTextContent(/voir l.offre/i)
    expect(cta.textContent).not.toMatch(/postuler/i)
  })

  it('expose un aria-label "Voir l\'offre : {titre}"', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const cta = screen.getByTestId('cta-voir-postuler')
    expect(cta).toHaveAttribute('aria-label', `Voir l'offre : ${baseItem.titre}`)
  })

  it('porte le style secondaire (surface + liseré + texte teal-deep), pas le plein teal-deep', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const cta = screen.getByTestId('cta-voir-postuler')
    expect(cta.className).toMatch(/bg-gj-surface/)
    expect(cta.className).toMatch(/border-gj-line-strong/)
    expect(cta.className).toMatch(/text-gj-teal-deep/)
    expect(cta.className).not.toMatch(/bg-gj-teal-deep/)
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

// ─── Bordure carte constante (GUIC-689 — le rouge ne code plus le type) ──────

describe('Bordure carte constante — seule la pastille porte l’urgence', () => {
  it('conserve border-gj-line même quand la deadline est urgente', () => {
    const item = {
      ...baseItem,
      deadline: new Date(FIXED_NOW + 2 * 86_400_000).toISOString(),
    }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const card = screen.getByTestId('opp-card')
    expect(card.className).toMatch(/border-gj-line\b/)
    expect(card.className).not.toMatch(/border-gj-red/)
  })
})

// ─── Cible tactile favori (GUIC-689 — 44px min mobile) ───────────────────────

describe('Cible tactile bouton favori', () => {
  it('respecte 44×44px par défaut (mobile) et autorise 38×38px en desktop dense', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const favori = screen.getByRole('button', { name: /ajouter aux favoris/i })
    expect(favori.className).toMatch(/w-\[44px\]/)
    expect(favori.className).toMatch(/h-\[44px\]/)
    expect(favori.className).toMatch(/lg:w-\[38px\]/)
    expect(favori.className).toMatch(/lg:h-\[38px\]/)
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
