import { render, screen, fireEvent } from '@testing-library/react'
import { RecruteurSidebar } from '@/components/layout/RecruteurSidebar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/recruteur/tableau-de-bord',
}))

describe('<RecruteurSidebar /> — collapse desktop (GUIC-402)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('expose un bouton toggle collapse avec aria-expanded', () => {
    render(<RecruteurSidebar />)
    const toggle = screen.getByRole('button', { name: /réduire|réduire la barre|collapse/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('persiste l’état collapsed dans localStorage', () => {
    render(<RecruteurSidebar />)
    const toggle = screen.getByRole('button', { name: /réduire|réduire la barre|collapse/i })
    fireEvent.click(toggle)
    expect(window.localStorage.getItem('gj-recruteur-sidebar-collapsed')).toBe('true')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('restaure l’état collapsed depuis localStorage au mount', () => {
    window.localStorage.setItem('gj-recruteur-sidebar-collapsed', 'true')
    render(<RecruteurSidebar />)
    const toggle = screen.getByRole('button', { name: /étendre|développer|expand/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
