/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './index'

describe('ThemeToggle', () => {
  it('en clair : propose de passer en sombre (icône lune, aria-pressed=false)', () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} />)
    const btn = screen.getByRole('button', { name: /sombre/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn.querySelector('use')).toHaveAttribute('href', '/icons.svg#i-moon')
  })

  it('en sombre : propose de passer en clair (icône soleil, aria-pressed=true)', () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />)
    const btn = screen.getByRole('button', { name: /clair/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn.querySelector('use')).toHaveAttribute('href', '/icons.svg#i-sun')
  })

  it('déclenche onToggle au clic', async () => {
    const onToggle = jest.fn()
    render(<ThemeToggle theme="light" onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
