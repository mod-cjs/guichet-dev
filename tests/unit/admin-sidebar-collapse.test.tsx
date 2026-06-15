import { render, screen, fireEvent } from '@testing-library/react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/tableau-de-bord',
}))

describe('<AdminSidebar /> — collapse desktop (GUIC-402)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('expose un bouton toggle collapse avec aria-expanded', () => {
    render(<AdminSidebar />)
    const toggle = screen.getByRole('button', { name: /réduire|réduire la barre|collapse/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('persiste l’état collapsed dans localStorage à l’ouverture', () => {
    render(<AdminSidebar />)
    const toggle = screen.getByRole('button', { name: /réduire|réduire la barre|collapse/i })
    fireEvent.click(toggle)
    expect(window.localStorage.getItem('gj-admin-sidebar-collapsed')).toBe('true')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('restaure l’état collapsed depuis localStorage au mount', () => {
    window.localStorage.setItem('gj-admin-sidebar-collapsed', 'true')
    render(<AdminSidebar />)
    const toggle = screen.getByRole('button', { name: /étendre|développer|expand/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
