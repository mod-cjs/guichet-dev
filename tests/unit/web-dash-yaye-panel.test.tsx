import { render, screen, fireEvent } from '@testing-library/react'
import { WebDashYayePanel } from '@/components/dashboard/WebDashYayePanel'

// GUIC-689 (finding A1) — le panel est monté sans prop `onOpen` sur le
// dashboard (Server Component) : le CTA doit donc s'ouvrir via le hook
// partagé `useYayePanel`, comme WebDashHero.
const mockOpen = jest.fn()
jest.mock('@/components/yaye/YayeProvider', () => ({
  useYayePanel: () => ({ isOpen: false, open: mockOpen, close: jest.fn(), toggle: jest.fn() }),
}))

describe('<WebDashYayePanel />', () => {
  beforeEach(() => {
    mockOpen.mockClear()
  })

  it('rend le badge IA et le statut conseillère', () => {
    render(<WebDashYayePanel />)
    expect(screen.getByText('IA')).toBeInTheDocument()
    expect(screen.getByText(/Conseillère IA/i)).toBeInTheDocument()
  })

  it('utilise le preview par défaut', () => {
    render(<WebDashYayePanel />)
    expect(screen.getByText(/Salama/i)).toBeInTheDocument()
  })

  it('rend un preview custom quand fourni', () => {
    render(<WebDashYayePanel preview="Coucou Awa" />)
    expect(screen.getByText(/Coucou Awa/i)).toBeInTheDocument()
  })

  it('appelle onOpen quand on clique le CTA', () => {
    const onOpen = jest.fn()
    render(<WebDashYayePanel onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir le chat Yaye/i }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("ouvre le drawer Yaye via useYayePanel quand monté sans onOpen (GUIC-689 — CTA mort sur le dashboard)", () => {
    render(<WebDashYayePanel />)
    const cta = screen.getByRole('button', { name: /Ouvrir le chat Yaye/i })
    expect(cta).toHaveAttribute('aria-haspopup', 'dialog')
    fireEvent.click(cta)
    expect(mockOpen).toHaveBeenCalledTimes(1)
  })
})
