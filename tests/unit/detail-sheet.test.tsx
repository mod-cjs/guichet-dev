import { render, screen, act, fireEvent } from '@testing-library/react'
import { DetailSheet } from '@/components/opportunites/DetailSheet'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

const back = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back, push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const detail = {
  id: 'opp-1',
  slug: 'stage-data-science',
  titre: 'Stage Data Science',
  organisation: 'Sonatel',
  type: 'Stage',
  domaine: 'Numerique',
  region: 'Dakar',
  description: 'Description du stage…',
  remuneration: '350 000 FCFA',
  deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
  lienExterne: null,
  vues: 0,
  statut: 'PUBLIE',
  programme: null,
  typeSlug: null,
  actionLabel: null,
  requiresFileUpload: false,
  fileLabel: null,
  skills: [],
  tags: [],
  details: null,
} as unknown as Detail

beforeEach(() => {
  back.mockClear()
})

/**
 * GUIC-197 — DetailSheet expose le détail dans un Sheet variant="side"
 * (slide-over droit 620px desktop, bottom-sheet mobile).
 */
describe('<DetailSheet /> (GUIC-197)', () => {
  it("rend un dialog ARIA avec le détail de l'opportunité", () => {
    render(
      <FavorisProvider isAuthenticated={false}>
        <DetailSheet detail={detail} viewer={null} />
      </FavorisProvider>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Stage Data Science')).toBeInTheDocument()
  })

  it('ferme via Escape → router.back()', () => {
    render(
      <FavorisProvider isAuthenticated={false}>
        <DetailSheet detail={detail} viewer={null} />
      </FavorisProvider>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(back).toHaveBeenCalled()
  })

  it('ferme via clic sur overlay → router.back()', () => {
    const { container } = render(
      <FavorisProvider isAuthenticated={false}>
        <DetailSheet detail={detail} viewer={null} />
      </FavorisProvider>,
    )
    const overlay = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay)
    expect(back).toHaveBeenCalled()
  })
})
