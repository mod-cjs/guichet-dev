import { render, screen, fireEvent } from '@testing-library/react'
import { YayeFab } from '@/components/ui/Yaye/YayeFab'

describe('<YayeFab />', () => {
  it('rend un bouton avec aria-label par défaut "Parler à Yaye"', () => {
    render(<YayeFab />)
    expect(screen.getByRole('button', { name: /parler à yaye/i })).toBeInTheDocument()
  })

  it('respecte un aria-label personnalisé', () => {
    render(<YayeFab aria-label="Ouvrir l'assistant" />)
    expect(screen.getByRole('button', { name: /ouvrir l'assistant/i })).toBeInTheDocument()
  })

  it('appelle onClick au clic', () => {
    const onClick = jest.fn()
    render(<YayeFab onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('positionne le FAB à droite et applique le z-index chat', () => {
    render(<YayeFab bottom={100} right={24} />)
    const btn = screen.getByRole('button')
    const style = btn.getAttribute('style') ?? ''
    expect(style).toMatch(/right:\s*24px/)
    expect(style).toMatch(/z-index:\s*var\(--gj-z-chat\)/)
    expect(btn.className).toMatch(/fixed/)
  })
})
