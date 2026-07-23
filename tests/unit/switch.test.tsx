import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '@/components/ui/Switch'

describe('<Switch />', () => {
  it('rend un rôle switch avec aria-checked reflétant checked', () => {
    const { rerender } = render(
      <Switch checked={false} onChange={jest.fn()} aria-label="Contraste élevé" />,
    )
    const sw = screen.getByRole('switch', { name: /contraste élevé/i })
    expect(sw).toHaveAttribute('aria-checked', 'false')

    rerender(<Switch checked onChange={jest.fn()} aria-label="Contraste élevé" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('appelle onChange avec la valeur inversée au clic', () => {
    const onChange = jest.fn()
    render(<Switch checked={false} onChange={onChange} aria-label="FALC" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('bascule au clavier (Espace et Entrée)', () => {
    const onChange = jest.fn()
    render(<Switch checked onChange={onChange} aria-label="FALC" />)
    const sw = screen.getByRole('switch')
    fireEvent.keyDown(sw, { key: ' ' })
    expect(onChange).toHaveBeenLastCalledWith(false)
    fireEvent.keyDown(sw, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('ignore clic et clavier quand disabled', () => {
    const onChange = jest.fn()
    render(<Switch checked={false} onChange={onChange} disabled aria-label="FALC" />)
    const sw = screen.getByRole('switch')
    expect(sw).toBeDisabled()
    fireEvent.click(sw)
    fireEvent.keyDown(sw, { key: ' ' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ne soumet pas les formulaires (type=button)', () => {
    render(<Switch checked={false} onChange={jest.fn()} aria-label="FALC" />)
    expect(screen.getByRole('switch')).toHaveAttribute('type', 'button')
  })

  it('est exporté par le barrel @/components/ui', async () => {
    const barrel = await import('@/components/ui')
    expect(barrel.Switch).toBe(Switch)
  })
})
