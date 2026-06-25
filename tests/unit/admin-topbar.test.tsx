/**
 * AdminTopBar (Lot 11 chrome) — G8/G10.
 * La cloche est un raccourci vers la file de modération (badge = en attente),
 * et l'ancien bouton « Exporter » non câblé a été retiré.
 */
import { render, screen } from '@testing-library/react'
import { AdminTopBar } from '@/components/layout/AdminSidebar/AdminTopBar'

jest.mock('next/navigation', () => ({ usePathname: () => '/admin/tableau-de-bord' }))

describe('AdminTopBar', () => {
  it('la cloche est un lien vers la file de modération', () => {
    render(<AdminTopBar notificationCount={5} />)
    const link = screen.getByRole('link', { name: /modération/i })
    expect(link).toHaveAttribute('href', '/admin/opportunites')
    expect(link.textContent).toContain('5')
  })

  it('n’affiche pas de badge quand le compteur est 0', () => {
    render(<AdminTopBar notificationCount={0} />)
    const link = screen.getByRole('link', { name: /modération/i })
    expect(link.textContent).not.toMatch(/\d/)
  })

  it('n’expose plus de bouton « Exporter » mort', () => {
    render(<AdminTopBar />)
    expect(screen.queryByRole('button', { name: /exporter/i })).toBeNull()
  })
})
