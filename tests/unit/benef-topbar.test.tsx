import { render, screen, fireEvent } from '@testing-library/react'
import { BenefTopBar } from '@/components/layout/BenefTopBar'

const pushMock = jest.fn()
jest.mock('next/navigation', () => {
  const params = new URLSearchParams()
  return {
    useRouter: () => ({ push: (...args: unknown[]) => pushMock(...args) }),
    usePathname: () => '/jeune',
    useSearchParams: () => params,
  }
})

describe('<BenefTopBar />', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('rend la searchbox et la zone droite minimale (notifications + aide)', () => {
    render(<BenefTopBar />)
    expect(screen.getByRole('searchbox', { name: /Rechercher/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Aide$/i })).toBeInTheDocument()
  })

  it("n'expose plus favoris, UserMenu ni Yaye dans la topbar (GUIC-413)", () => {
    render(<BenefTopBar />)
    expect(screen.queryByRole('button', { name: /favoris/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Menu utilisateur/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Ouvrir la conversation avec Yaye/i }),
    ).not.toBeInTheDocument()
  })

  it('appelle onSearchChange quand la valeur change', () => {
    const onChange = jest.fn()
    render(<BenefTopBar searchQuery="" onSearchChange={onChange} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'stage' } })
    expect(onChange).toHaveBeenCalledWith('stage')
  })

  it('affiche le badge unread sur la cloche', () => {
    render(<BenefTopBar unread={5} />)
    expect(screen.getByLabelText(/5 non lues/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('plafonne le badge unread à 99+', () => {
    render(<BenefTopBar unread={200} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('appelle onBellClick / onInfoClick', () => {
    const onBell = jest.fn()
    const onInfo = jest.fn()
    render(<BenefTopBar onBellClick={onBell} onInfoClick={onInfo} />)
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Aide$/i }))
    expect(onBell).toHaveBeenCalled()
    expect(onInfo).toHaveBeenCalled()
  })

  it('navigue vers /opportunites?q= au submit du formulaire', () => {
    render(<BenefTopBar />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'data science' } })
    fireEvent.submit(input.closest('form')!)
    expect(pushMock).toHaveBeenCalledWith('/opportunites?q=data%20science')
  })

  it('ignore la soumission si la query est vide', () => {
    render(<BenefTopBar />)
    const input = screen.getByRole('searchbox')
    fireEvent.submit(input.closest('form')!)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('appelle onSearchSubmit si fourni au lieu de naviguer', () => {
    const onSubmit = jest.fn()
    render(<BenefTopBar onSearchSubmit={onSubmit} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'stage' } })
    fireEvent.submit(input.closest('form')!)
    expect(onSubmit).toHaveBeenCalledWith('stage')
    expect(pushMock).not.toHaveBeenCalled()
  })
})
