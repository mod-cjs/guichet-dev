/**
 * @jest-environment jsdom
 *
 * GUIC-689 (Lot D1) : `<OfflineBanner />` — bandeau sticky sombre conforme au
 * Lot 13 (`design-guichet-v5/system-states.jsx` L41-47). Ne rend rien en
 * ligne, apparaît/disparaît avec l'état réseau, rôle ARIA `status`.
 */
import { render, screen, act } from '@testing-library/react'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

const refreshMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

function setOnlineState(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value })
}

describe('<OfflineBanner /> (GUIC-689 — Lot 13)', () => {
  afterEach(() => {
    setOnlineState(true)
    refreshMock.mockClear()
  })

  it('ne rend rien quand le navigateur est en ligne', () => {
    setOnlineState(true)
    const { container } = render(<OfflineBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('apparaît hors-ligne avec role="status" et aria-live="polite"', () => {
    setOnlineState(false)
    render(<OfflineBanner />)
    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(/hors-ligne/i)
    expect(banner).toHaveAttribute('aria-live', 'polite')
  })

  it("utilise l'icône sprite globe (jamais d'emoji)", () => {
    setOnlineState(false)
    const { container } = render(<OfflineBanner />)
    const use = container.querySelector('svg use')
    expect(use?.getAttribute('href')).toBe('/icons.svg#i-globe')
  })

  it('disparaît quand l\'événement "online" est émis', () => {
    setOnlineState(false)
    const { container } = render(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => {
      setOnlineState(true)
      window.dispatchEvent(new Event('online'))
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('le lien "Réessayer" relance la navigation (router.refresh)', () => {
    setOnlineState(false)
    render(<OfflineBanner />)
    screen.getByRole('button', { name: 'Réessayer' }).click()
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('reste sticky en tête de zone (position: sticky, top: 0)', () => {
    setOnlineState(false)
    render(<OfflineBanner />)
    const banner = screen.getByRole('status')
    expect(banner.className).toMatch(/\bsticky\b/)
    expect(banner.className).toMatch(/\btop-0\b/)
  })
})
