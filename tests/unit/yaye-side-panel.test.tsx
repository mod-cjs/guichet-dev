import { render, screen, fireEvent } from '@testing-library/react'
import { YayeSidePanel } from '@/components/ui/Yaye/YayeSidePanel'

// scrollIntoView n'est pas implémenté sous JSDOM (auto-scroll du drawer).
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

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
    // Sans prenom, le greeting générique "Salama !" est utilisé (pas de nom codé en dur)
    expect(screen.getByText(/Salama/i)).toBeInTheDocument()
    expect(screen.getByText(/stage en agro/i)).toBeInTheDocument()
    expect(screen.getByText(/celles qui collent vraiment à ton profil/i)).toBeInTheDocument()
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

  // ── Parité avec la page fullscreen (GUIC-259, UX polish) ──────────────────

  it('expose la même barre d’actions que la page fullscreen (pièce jointe · micro · envoi)', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /Joindre un fichier/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dicter au micro/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Envoyer$/i })).toBeInTheDocument()
  })

  it('expose la zone de conversation en aria-live (role=log)', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    expect(screen.getByRole('log', { name: /Conversation Yaye/i })).toBeInTheDocument()
  })

  it('affiche l’indicateur de frappe quand sending=true', () => {
    render(<YayeSidePanel open onClose={() => {}} sending />)
    expect(screen.getByTestId('yaye-typing')).toBeInTheDocument()
  })

  it('n’affiche pas l’indicateur de frappe quand sending=false', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    expect(screen.queryByTestId('yaye-typing')).not.toBeInTheDocument()
  })

  it('piège le focus : Tab depuis le dernier focusable revient au premier (bouton Fermer)', () => {
    render(
      <YayeSidePanel
        open
        onClose={() => {}}
        quickReplies={[{ label: 'Action', value: 'a' }]}
        onQuickReply={() => {}}
      />,
    )
    const closeBtn = screen.getByRole('button', { name: /^Fermer$/i })
    const sendBtn = screen.getByRole('button', { name: /^Envoyer$/i })
    sendBtn.focus()
    expect(sendBtn).toHaveFocus()
    // Tab depuis le dernier élément focusable → on boucle vers le premier (close).
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(closeBtn).toHaveFocus()
  })

  it('piège le focus : Shift+Tab depuis le premier focusable va au dernier', () => {
    render(<YayeSidePanel open onClose={() => {}} />)
    const closeBtn = screen.getByRole('button', { name: /^Fermer$/i })
    const sendBtn = screen.getByRole('button', { name: /^Envoyer$/i })
    closeBtn.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(sendBtn).toHaveFocus()
  })
})
