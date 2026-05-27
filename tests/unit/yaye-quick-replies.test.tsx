import { render, screen, fireEvent } from '@testing-library/react'
import { QuickReplies } from '@/components/ui/Yaye/QuickReplies'

describe('<QuickReplies />', () => {
  const replies = [
    { label: 'Oui', value: 'yes' },
    { label: 'Non', value: 'no' },
    { label: 'Peut-être', value: 'maybe' },
  ]

  it('rend tous les boutons', () => {
    render(<QuickReplies replies={replies} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /oui/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /non/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /peut-être/i })).toBeInTheDocument()
  })

  it('appelle onSelect avec la value correspondante au clic', () => {
    const onSelect = jest.fn()
    render(<QuickReplies replies={replies} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /oui/i }))
    expect(onSelect).toHaveBeenCalledWith('yes')
    fireEvent.click(screen.getByRole('button', { name: /peut-être/i }))
    expect(onSelect).toHaveBeenLastCalledWith('maybe')
  })

  it('expose un groupe ARIA avec label par défaut', () => {
    render(<QuickReplies replies={replies} onSelect={() => {}} />)
    expect(screen.getByRole('group', { name: /réponses suggérées/i })).toBeInTheDocument()
  })

  it('respecte un aria-label custom', () => {
    render(<QuickReplies replies={replies} onSelect={() => {}} aria-label="Options" />)
    expect(screen.getByRole('group', { name: /options/i })).toBeInTheDocument()
  })

  it('est navigable au clavier (focus + Entrée)', () => {
    const onSelect = jest.fn()
    render(<QuickReplies replies={replies} onSelect={onSelect} />)
    const btn = screen.getByRole('button', { name: /non/i })
    btn.focus()
    expect(document.activeElement).toBe(btn)
    fireEvent.click(btn)
    expect(onSelect).toHaveBeenCalledWith('no')
  })
})
