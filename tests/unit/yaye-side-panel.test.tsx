import { render, screen, fireEvent } from '@testing-library/react'
import { YayeSidePanel } from '@/components/ui/Yaye/YayeSidePanel'

describe('<YayeSidePanel />', () => {
  it('ne rend rien quand open=false', () => {
    render(<YayeSidePanel open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('rend un dialog modal accessible quand open=true', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: /Conversation avec Yaye/i })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('affiche les messages par défaut (mock)', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    expect(screen.getByText(/Salama Awa/i)).toBeInTheDocument()
    expect(screen.getByText(/stage en agro/i)).toBeInTheDocument()
    expect(screen.getByText(/J'ai filtré 247 offres/i)).toBeInTheDocument()
  })

  it('appelle onClose au clic sur le bouton fermer', () => {
    const onClose = jest.fn()
    render(<YayeSidePanel open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /^Fermer$/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('appelle onClose au clic sur le backdrop', () => {
    const onClose = jest.fn()
    render(<YayeSidePanel open onClose={onClose} />)
    fireEvent.click(screen.getByTestId('yaye-side-panel-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('appelle onClose à la touche Escape', () => {
    const onClose = jest.fn()
    render(<YayeSidePanel open onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ne réagit pas à Escape quand open=false', () => {
    const onClose = jest.fn()
    render(<YayeSidePanel open={false} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('rend les quick replies et appelle onQuickReply', () => {
    const onQuickReply = jest.fn()
    render(
      <YayeSidePanel
        open
        onClose={() => {}}
        quickReplies={[{ label: 'Test action', value: 'action-1' }]}
        onQuickReply={onQuickReply}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Test action/i }))
    expect(onQuickReply).toHaveBeenCalledWith('action-1')
  })

  it('place le focus initial sur le bouton fermer', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /^Fermer$/i })).toHaveFocus()
  })
})
