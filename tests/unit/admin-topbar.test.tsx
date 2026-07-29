/**
 * AdminTopBar (Lot 11 chrome) — G8/G10.
 * La cloche est un raccourci vers la file de modération (badge = en attente),
 * et l'ancien bouton « Exporter » non câblé a été retiré.
 */
import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { AdminTopBar } from '@/components/layout/AdminSidebar/AdminTopBar'
import { AdminThemeProvider } from '@/components/layout/AdminSidebar/AdminThemeProvider'

jest.mock('next/navigation', () => ({ usePathname: () => '/admin/tableau-de-bord' }))

// AdminTopBar consomme le contexte de thème admin (GUIC-680) : rendu sous provider.
function renderTopBar(props: ComponentProps<typeof AdminTopBar> = {}) {
  return render(
    <AdminThemeProvider>
      <AdminTopBar {...props} />
    </AdminThemeProvider>,
  )
}

describe('AdminTopBar', () => {
  it('la cloche est un lien vers la file de modération', () => {
    renderTopBar({ notificationCount: 5 })
    const link = screen.getByRole('link', { name: /modération/i })
    expect(link).toHaveAttribute('href', '/admin/opportunites')
    expect(link.textContent).toContain('5')
  })

  it('n’affiche pas de badge quand le compteur est 0', () => {
    renderTopBar({ notificationCount: 0 })
    const link = screen.getByRole('link', { name: /modération/i })
    expect(link.textContent).not.toMatch(/\d/)
  })

  it('n’expose plus de bouton « Exporter » mort', () => {
    renderTopBar()
    expect(screen.queryByRole('button', { name: /exporter/i })).toBeNull()
  })

  it('expose la bascule de thème clair/sombre (GUIC-680)', () => {
    renderTopBar()
    // Défaut = sombre → le toggle propose « Passer en thème clair ».
    expect(screen.getByRole('button', { name: /passer en th[èe]me (clair|sombre)/i })).toBeInTheDocument()
  })
})
