import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'

function Harness({ initialOpen = true, size }: { initialOpen?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <button data-testid="trigger" onClick={() => setOpen(true)}>open</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirmation" size={size}>
        <button data-testid="ok">OK</button>
      </Modal>
    </>
  )
}

describe('<Modal />', () => {
  it('rend un dialog avec aria-modal et aria-labelledby', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const id = dialog.getAttribute('aria-labelledby')
    expect(id).not.toBeNull()
    expect(document.getElementById(id!)?.textContent).toBe('Confirmation')
  })

  it('applique la taille sm (380px)', () => {
    render(<Harness size="sm" />)
    expect(screen.getByRole('dialog').className).toMatch(/max-w-\[380px\]/)
  })

  it('applique la taille lg (680px)', () => {
    render(<Harness size="lg" />)
    expect(screen.getByRole('dialog').className).toMatch(/max-w-\[680px\]/)
  })

  it('ferme via Escape', () => {
    render(<Harness />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('restitue le focus sur le déclencheur après fermeture', () => {
    render(<Harness initialOpen={false} />)
    const trigger = screen.getByTestId('trigger')
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(document.activeElement).toBe(trigger)
  })

  // GUIC-689 — Lot C2.1 : bouton fermer via sprite <Icon name="close" />,
  // jamais le glyphe texte brut « ✕ » (aligné sur Sheet).
  it('utilise l’icône sprite pour le bouton fermer (avec title)', () => {
    render(<Harness />)
    const closeBtn = screen.getByRole('button', { name: 'Fermer' })
    const use = closeBtn.querySelector('use')
    expect(use).not.toBeNull()
    expect(use!.getAttribute('href')).toBe('/icons.svg#i-close')
    expect(closeBtn.textContent).not.toMatch(/✕/)
  })

  it('utilise l’icône sprite pour le bouton fermer (sans title)', () => {
    function NoTitleHarness() {
      const [open, setOpen] = useState(true)
      return (
        <Modal isOpen={open} onClose={() => setOpen(false)}>
          <p>Contenu</p>
        </Modal>
      )
    }
    render(<NoTitleHarness />)
    const closeBtn = screen.getByRole('button', { name: 'Fermer' })
    const use = closeBtn.querySelector('use')
    expect(use).not.toBeNull()
    expect(use!.getAttribute('href')).toBe('/icons.svg#i-close')
    expect(closeBtn.textContent).not.toMatch(/✕/)
  })
})
