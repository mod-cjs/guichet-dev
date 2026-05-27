import { render, screen } from '@testing-library/react'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'

describe('<YayeAvatar />', () => {
  it('rend un avatar avec label ARIA "Assistant IA"', () => {
    render(<YayeAvatar />)
    const els = screen.getAllByLabelText('Assistant IA')
    expect(els.length).toBeGreaterThanOrEqual(1)
    expect(els[0]).toHaveTextContent('Y')
  })

  it('applique la taille demandée', () => {
    const { container } = render(<YayeAvatar size={48} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('48px')
    expect(el.style.height).toBe('48px')
  })

  it('affiche le badge "IA" quand withBadge', () => {
    render(<YayeAvatar withBadge />)
    expect(screen.getByText('IA')).toBeInTheDocument()
  })

  it('omet le badge par défaut', () => {
    render(<YayeAvatar />)
    expect(screen.queryByText('IA')).not.toBeInTheDocument()
  })
})
