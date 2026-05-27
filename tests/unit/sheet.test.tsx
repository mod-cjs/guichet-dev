import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'

function Harness({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <button data-testid="trigger" onClick={() => setOpen(true)}>open</button>
      <Sheet isOpen={open} onClose={() => setOpen(false)} title="Mon titre">
        <button data-testid="action">Action</button>
        <button data-testid="action-2">Action 2</button>
      </Sheet>
    </>
  )
}

describe('<Sheet />', () => {
  it('rend un dialog avec aria-modal et aria-labelledby quand un titre est fourni', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).not.toBeNull()
    expect(document.getElementById(labelledBy!)?.textContent).toBe('Mon titre')
  })

  it('ferme via la touche Escape', () => {
    render(<Harness />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ferme via le clic sur l\'overlay', () => {
    const { container } = render(<Harness />)
    const overlay = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('restitue le focus sur le déclencheur après fermeture', () => {
    render(<Harness initialOpen={false} />)
    const trigger = screen.getByTestId('trigger')
    trigger.focus()
    expect(document.activeElement).toBe(trigger)
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(document.activeElement).toBe(trigger)
  })

  it('piège le focus : Tab depuis le dernier élément revient au premier', () => {
    render(<Harness />)
    const action2 = screen.getByTestId('action-2')
    action2.focus()
    expect(document.activeElement).toBe(action2)
    act(() => {
      fireEvent.keyDown(document, { key: 'Tab' })
    })
    // Le premier focusable est le bouton "Fermer" (header)
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Fermer')
  })
})
