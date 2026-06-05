import { render, screen, fireEvent } from '@testing-library/react'
import { WebDashYayePanel } from '@/components/dashboard/WebDashYayePanel'

describe('<WebDashYayePanel />', () => {
  it('rend le badge IA et la mention en ligne', () => {
    render(<WebDashYayePanel />)
    expect(screen.getByText('IA')).toBeInTheDocument()
    expect(screen.getByText(/en ligne/i)).toBeInTheDocument()
  })

  it('utilise le preview par défaut', () => {
    render(<WebDashYayePanel />)
    expect(screen.getByText(/Salama/i)).toBeInTheDocument()
  })

  it('rend un preview custom quand fourni', () => {
    render(<WebDashYayePanel preview="Coucou Awa" />)
    expect(screen.getByText(/Coucou Awa/i)).toBeInTheDocument()
  })

  it('appelle onOpen quand on clique le CTA', () => {
    const onOpen = jest.fn()
    render(<WebDashYayePanel onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir le chat Yaye/i }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
