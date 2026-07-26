/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminThemeProvider, useAdminTheme } from './AdminThemeProvider'

function Consumer() {
  const { theme, toggle } = useAdminTheme()
  return (
    <button type="button" onClick={toggle}>
      theme:{theme}
    </button>
  )
}

describe('AdminThemeProvider', () => {
  beforeEach(() => window.localStorage.clear())

  it('démarre en clair (aucun scope) puis bascule en sombre (data-admin-theme)', async () => {
    const { container } = render(
      <AdminThemeProvider>
        <Consumer />
      </AdminThemeProvider>,
    )
    const scope = container.querySelector('[class*="flex-1"]') as HTMLElement
    expect(scope).not.toHaveAttribute('data-admin-theme')
    expect(screen.getByRole('button')).toHaveTextContent('theme:light')

    await userEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toHaveTextContent('theme:dark')
    expect(scope).toHaveAttribute('data-admin-theme', 'dark')
  })

  it('persiste le choix (relecture au montage suivant)', async () => {
    const first = render(
      <AdminThemeProvider>
        <Consumer />
      </AdminThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button'))
    first.unmount()

    render(
      <AdminThemeProvider>
        <Consumer />
      </AdminThemeProvider>,
    )
    // au remontage, l'effet relit le storage -> sombre
    expect(await screen.findByText('theme:dark')).toBeInTheDocument()
  })

  it('useAdminTheme hors provider lève une erreur', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow()
    spy.mockRestore()
  })
})
