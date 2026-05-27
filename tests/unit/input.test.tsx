import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/Input'

describe('<Input />', () => {
  it('rend un input avec label associé via id', () => {
    render(<Input id="email" label="Email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toBeInTheDocument()
    expect(input.id).toBe('email')
  })

  it('affiche un astérisque rouge quand required', () => {
    render(<Input id="phone" label="Téléphone" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('affiche un hint si fourni et pas d’erreur', () => {
    render(<Input id="x" label="X" hint="Format attendu" />)
    expect(screen.getByText('Format attendu')).toBeInTheDocument()
  })

  it('affiche l’erreur et masque le hint en cas d’erreur', () => {
    render(<Input id="x" label="X" hint="Format attendu" error="Champ requis" />)
    expect(screen.getByText('Champ requis')).toBeInTheDocument()
    expect(screen.queryByText('Format attendu')).not.toBeInTheDocument()
  })

  it('propage les changements via onChange', () => {
    const onChange = jest.fn()
    render(<Input id="n" label="Nom" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Awa' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('est désactivé quand disabled', () => {
    render(<Input id="x" label="X" disabled />)
    expect(screen.getByLabelText('X')).toBeDisabled()
  })

  it('utilise font-size 16px pour anti-zoom iOS', () => {
    render(<Input id="x" label="X" />)
    expect(screen.getByLabelText('X').className).toMatch(/text-\[16px\]/)
  })
})
