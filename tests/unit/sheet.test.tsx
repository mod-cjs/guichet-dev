import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mql: Partial<MediaQueryList> = {
    matches,
    media: '(min-width: 768px)',
    addEventListener: (_e: string, l: EventListener) =>
      listeners.push(l as (e: MediaQueryListEvent) => void),
    removeEventListener: (_e: string, l: EventListener) => {
      const i = listeners.indexOf(l as (e: MediaQueryListEvent) => void)
      if (i >= 0) listeners.splice(i, 1)
    },
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => mql as MediaQueryList,
  })
}

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

  it("ne re-pose pas le focus initial à chaque re-render du parent (GUIC-221 #6)", () => {
    function Typing() {
      const [val, setVal] = useState('')
      return (
        <Sheet isOpen onClose={() => {}} title="Saisie">
          <textarea
            data-testid="ta"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        </Sheet>
      )
    }
    render(<Typing />)
    const ta = screen.getByTestId('ta') as HTMLTextAreaElement
    ta.focus()
    expect(document.activeElement).toBe(ta)
    // Simule la frappe utilisateur : doit conserver le focus sur la textarea
    fireEvent.change(ta, { target: { value: 'a' } })
    expect(document.activeElement).toBe(ta)
    fireEvent.change(ta, { target: { value: 'ab' } })
    expect(document.activeElement).toBe(ta)
  })

  describe('GUIC-417 — hauteur panel selon variant + viewport', () => {
    it('variant="side" sur desktop (md+) : max-height = 100dvh (pleine hauteur)', () => {
      mockMatchMedia(true)
      render(
        <Sheet isOpen onClose={() => {}} variant="side" title="Détail">
          <p>contenu</p>
        </Sheet>,
      )
      const dialog = screen.getByRole('dialog') as HTMLElement
      expect(dialog.style.maxHeight).toBe('100dvh')
    })

    it('variant="side" sur mobile : max-height = maxHeightPct% (bottom-sheet)', () => {
      mockMatchMedia(false)
      render(
        <Sheet isOpen onClose={() => {}} variant="side" maxHeightPct={70} title="Détail">
          <p>contenu</p>
        </Sheet>,
      )
      const dialog = screen.getByRole('dialog') as HTMLElement
      expect(dialog.style.maxHeight).toBe('70%')
    })

    it('variant="bottom" sur desktop : max-height = maxHeightPct% (pas de pleine hauteur)', () => {
      mockMatchMedia(true)
      render(
        <Sheet isOpen onClose={() => {}} variant="bottom" maxHeightPct={94} title="Filtres">
          <p>contenu</p>
        </Sheet>,
      )
      const dialog = screen.getByRole('dialog') as HTMLElement
      expect(dialog.style.maxHeight).toBe('94%')
    })
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
