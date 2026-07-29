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

  it('démarre en SOMBRE par défaut (scope data-admin-theme=dark) puis bascule en clair', async () => {
    const { container } = render(
      <AdminThemeProvider>
        <Consumer />
      </AdminThemeProvider>,
    )
    const scope = container.querySelector('.gj-admin-scope') as HTMLElement
    expect(scope).toHaveAttribute('data-admin-theme', 'dark')
    expect(screen.getByRole('button')).toHaveTextContent('theme:dark')

    await userEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toHaveTextContent('theme:light')
    expect(scope).not.toHaveAttribute('data-admin-theme')
  })

  it('persiste le choix (relecture au montage suivant)', async () => {
    const first = render(
      <AdminThemeProvider>
        <Consumer />
      </AdminThemeProvider>,
    )
    // défaut sombre -> on bascule en clair, qui doit être persisté
    await userEvent.click(screen.getByRole('button'))
    first.unmount()

    render(
      <AdminThemeProvider>
        <Consumer />
      </AdminThemeProvider>,
    )
    // au remontage, l'effet relit le storage -> clair
    expect(await screen.findByText('theme:light')).toBeInTheDocument()
  })

  it('useAdminTheme hors provider lève une erreur', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow()
    spy.mockRestore()
  })
})
