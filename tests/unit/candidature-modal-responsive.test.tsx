import { render, screen, act, fireEvent } from '@testing-library/react'
import { CandidatureModal } from '@/components/opportunites/CandidatureModal'

/**
 * GUIC-197 — la modal candidature bascule entre bottom-sheet (mobile) et
 * modal centrée (desktop ≥ 768px) selon `window.matchMedia('(min-width:768px)')`.
 */

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mql: Partial<MediaQueryList> = {
    matches,
    media: '(min-width: 768px)',
    addEventListener: (_e: string, l: EventListener) =>
      listeners.push(l as (e: MediaQueryListEvent) => void),
    removeEventListener: (_e: string, l: EventListener) => {
      const i = listeners.indexOf(l as (e: MediaQueryListEvent) => void)
      if (i >= 0) listeners.splice(i, 1)
    },
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => mql as MediaQueryList,
  })
}

const baseProps = {
  opportuniteId: 'opp-1',
  opportuniteTitre: 'Stage Data Science',
  viewer: { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' },
  isOpen: true,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
}

describe('<CandidatureModal /> — responsive (GUIC-197)', () => {
  beforeEach(() => {
    baseProps.onClose = jest.fn()
    baseProps.onSuccess = jest.fn()
  })

  it('affiche le titre et le bouton "Envoyer ma candidature" en desktop (modal centrée)', () => {
    mockMatchMedia(true)
    render(<CandidatureModal {...baseProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/Postuler — Stage Data Science/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Envoyer ma candidature/ }),
    ).toBeInTheDocument()
  })

  it('affiche le titre en mobile (bottom-sheet)', () => {
    mockMatchMedia(false)
    render(<CandidatureModal {...baseProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/Postuler — Stage Data Science/)).toBeInTheDocument()
  })

  it('ferme via Escape (desktop)', () => {
    mockMatchMedia(true)
    render(<CandidatureModal {...baseProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(baseProps.onClose).toHaveBeenCalled()
  })

  it('ferme via clic sur overlay (desktop)', () => {
    mockMatchMedia(true)
    const { container } = render(<CandidatureModal {...baseProps} />)
    const overlay = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay)
    expect(baseProps.onClose).toHaveBeenCalled()
  })

  it('ne rend rien si isOpen=false', () => {
    mockMatchMedia(true)
    render(<CandidatureModal {...baseProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
