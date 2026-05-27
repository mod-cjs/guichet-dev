import { render, screen, fireEvent } from '@testing-library/react'
import { FooterCTA } from '@/components/ui/FooterCTA'

describe('<FooterCTA />', () => {
  it('rend un bouton primary', () => {
    render(<FooterCTA primary={{ label: 'Continuer' }} />)
    expect(screen.getByRole('button', { name: /continuer/i })).toBeInTheDocument()
  })

  it('rend secondary + primary quand fourni', () => {
    render(
      <FooterCTA
        primary={{ label: 'Valider' }}
        secondary={{ label: 'Retour' }}
      />,
    )
    expect(screen.getByRole('button', { name: /valider/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument()
  })

  it('appelle les click handlers', () => {
    const onP = jest.fn()
    const onS = jest.fn()
    render(
      <FooterCTA
        primary={{ label: 'P', onClick: onP }}
        secondary={{ label: 'S', onClick: onS }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'P' }))
    fireEvent.click(screen.getByRole('button', { name: 'S' }))
    expect(onP).toHaveBeenCalledTimes(1)
    expect(onS).toHaveBeenCalledTimes(1)
  })

  it('désactive quand disabled', () => {
    const onP = jest.fn()
    render(<FooterCTA primary={{ label: 'P', onClick: onP }} disabled />)
    const btn = screen.getByRole('button', { name: 'P' })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onP).not.toHaveBeenCalled()
  })

  it('désactive et passe aria-busy quand loading', () => {
    render(<FooterCTA primary={{ label: 'Envoi' }} loading />)
    const btn = screen.getByRole('button', { name: /envoi/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })
})
