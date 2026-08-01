import { render, screen, fireEvent, act } from '@testing-library/react'
import { Toast } from '@/components/ui/Toast'

describe('<Toast />', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('rend message et detail', () => {
    render(<Toast message="OK" detail="Ton dossier est envoyé" onClose={() => {}} duration={0} />)
    expect(screen.getByText('OK')).toBeInTheDocument()
    expect(screen.getByText('Ton dossier est envoyé')).toBeInTheDocument()
  })

  it('utilise aria-live=polite pour info/success', () => {
    render(<Toast message="OK" variant="info" onClose={() => {}} duration={0} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('utilise aria-live=assertive pour danger/warning', () => {
    const { rerender } = render(<Toast message="!" variant="danger" onClose={() => {}} duration={0} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive')
    rerender(<Toast message="!" variant="warning" onClose={() => {}} duration={0} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive')
  })

  it('appelle onClose après duration (auto-dismiss)', () => {
    const onClose = jest.fn()
    render(<Toast message="hi" onClose={onClose} duration={3000} />)
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('appelle onClose + onDismiss au clic sur Fermer', () => {
    const onClose = jest.fn()
    const onDismiss = jest.fn()
    render(<Toast message="hi" onClose={onClose} onDismiss={onDismiss} duration={0} />)
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('accepte le prop legacy `type="error"` (alias danger)', () => {
    render(<Toast message="boom" type="error" onClose={() => {}} duration={0} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive')
  })

  it('fond sombre unique (design v5, Lot 14) quel que soit le variant', () => {
    const { rerender } = render(<Toast message="OK" variant="success" onClose={() => {}} duration={0} />)
    expect(screen.getByRole('status').className).toMatch(/bg-gj-ink/)
    rerender(<Toast message="OK" variant="danger" onClose={() => {}} duration={0} />)
    expect(screen.getByRole('status').className).toMatch(/bg-gj-ink/)
  })

  it('rend le bouton d\'action inline quand `action` est fourni', () => {
    const onClick = jest.fn()
    render(
      <Toast message="Candidature envoyée" onClose={() => {}} duration={0} action={{ label: 'Annuler', onClick }} />,
    )
    const actionBtn = screen.getByRole('button', { name: /annuler/i })
    expect(actionBtn).toBeInTheDocument()
    fireEvent.click(actionBtn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('n\'affiche pas de bouton d\'action si `action` est absent', () => {
    render(<Toast message="OK" onClose={() => {}} duration={0} />)
    expect(screen.queryByRole('button', { name: /annuler/i })).toBeNull()
  })
})
