import { render, screen, fireEvent } from '@testing-library/react'
import { OppCard, buildDeadlineInfo } from '@/components/opportunites/OppCard'
import type { OpportuniteListItem } from '@/types/opportunite'

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

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z').getTime()

describe('buildDeadlineInfo()', () => {
  it('retourne null si pas de deadline', () => {
    expect(buildDeadlineInfo(null)).toBeNull()
  })

  it("marque urgent pour deadline dans 7 jours ou moins (label J-N)", () => {
    const iso = new Date(FIXED_NOW + 3 * 86_400_000).toISOString()
    const info = buildDeadlineInfo(iso, FIXED_NOW)
    expect(info).toEqual({ label: 'J-3', urgent: true })
  })

  it("marque non urgent au-delà de 7 jours et formate la date", () => {
    const iso = new Date(FIXED_NOW + 30 * 86_400_000).toISOString()
    const info = buildDeadlineInfo(iso, FIXED_NOW)
    expect(info?.urgent).toBe(false)
    expect(info?.label).toMatch(/\d/)
  })

  it("retourne 'Clôturée' (non urgent) pour deadline passée", () => {
    const iso = new Date(FIXED_NOW - 86_400_000).toISOString()
    expect(buildDeadlineInfo(iso, FIXED_NOW)).toEqual({ label: 'Clôturée', urgent: false })
  })
})

describe('<OppCard />', () => {
  it('affiche titre, organisation, région et rémunération', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    expect(screen.getByText(baseItem.titre)).toBeInTheDocument()
    expect(screen.getByText(baseItem.organisation)).toBeInTheDocument()
    expect(screen.getByText('Dakar')).toBeInTheDocument()
    expect(screen.getByText('350 000 F/mois')).toBeInTheDocument()
  })

  it("rend un lien étiré vers /opportunites/<slug>", () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const link = screen.getByRole('link', { name: /stage data science/i })
    expect(link).toHaveAttribute('href', '/opportunites/stage-data-science')
  })

  it("appelle onToggleFavori avec l'id au clic sur le bouton favori", () => {
    const onToggle = jest.fn()
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter aux favoris/i }))
    expect(onToggle).toHaveBeenCalledWith('o1')
  })

  it('expose aria-pressed=true et label "Retirer" quand favori', () => {
    render(<OppCard item={baseItem} isFavori={true} onToggleFavori={() => {}} />)
    const btn = screen.getByRole('button', { name: /retirer des favoris/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche le score de matching quand fourni', () => {
    render(
      <OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} matchScore={94} />,
    )
    expect(screen.getByTestId('match-score')).toHaveTextContent('94%')
  })

  it("ne rend pas le badge match si matchScore est null", () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    expect(screen.queryByTestId('match-score')).not.toBeInTheDocument()
  })

  it("conserve la bordure gj-line même quand deadline urgente (GUIC-689 — l'urgence est portée par la pastille, pas la carte)", () => {
    const item = { ...baseItem, deadline: new Date(Date.now() + 2 * 86_400_000).toISOString() }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} />)
    const card = screen.getByTestId('opp-card')
    expect(card.className).toMatch(/border-gj-line\b/)
    expect(card.className).not.toMatch(/border-gj-red/)
  })

  it('le bouton favori respecte la cible tactile 44px (GUIC-689)', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const favori = screen.getByRole('button', { name: /ajouter aux favoris/i })
    expect(favori.className).toMatch(/w-\[44px\]/)
    expect(favori.className).toMatch(/h-\[44px\]/)
  })
})
