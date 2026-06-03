import { fireEvent, render, screen } from '@testing-library/react'
import { YayeSidePanel } from '@/components/ui/Yaye/YayeSidePanel'

describe('<YayeSidePanel />', () => {
  it('ne rend rien quand fermé', () => {
    const { container } = render(<YayeSidePanel isOpen={false} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('rend un dialog ARIA quand ouvert', () => {
    render(<YayeSidePanel isOpen onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('affiche les messages mock par défaut', () => {
    render(<YayeSidePanel isOpen onClose={() => {}} />)
    expect(screen.getByText(/Tambacounda/i)).toBeInTheDocument()
  })

  it('appelle onClose quand on clique sur le bouton ✕', () => {
    const onClose = jest.fn()
    render(<YayeSidePanel isOpen onClose={onClose} />)
    fireEvent.click(screen.getByLabelText(/Fermer le panneau Yaye/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('appelle onClose quand on appuie sur Escape', () => {
    const onClose = jest.fn()
    render(<YayeSidePanel isOpen onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('appelle onQuickReply quand on sélectionne une réponse rapide', () => {
    const onQuickReply = jest.fn()
    render(
      <YayeSidePanel
        isOpen
        onClose={() => {}}
        quickReplies={[{ label: 'Test', value: 'test' }]}
        onQuickReply={onQuickReply}
      />,
    )
    fireEvent.click(screen.getByText('Test'))
    expect(onQuickReply).toHaveBeenCalledWith('test')
  })

  it('appelle onSend avec le texte saisi', () => {
    const onSend = jest.fn()
    render(<YayeSidePanel isOpen onClose={() => {}} onSend={onSend} />)
    const input = screen.getByLabelText('Message à Yaye') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'salut' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(onSend).toHaveBeenCalledWith('salut')
  })
})
