/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreCardMobile } from '@/components/centres/CentreCardMobile'

const c = {
  id: 'c-dakar',
  slug: 'cjs-dakar',
  nom: 'CJS Dakar',
  region: 'Dakar',
  ville: 'Dakar',
}

describe('<CentreCardMobile />', () => {
  it('rend le nom + aria-label "Voir le centre {nom}"', () => {
    render(<CentreCardMobile centre={c} isOpen />)
    expect(screen.getByText('CJS Dakar')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Voir le centre CJS Dakar/i }),
    ).toBeInTheDocument()
  })

  it('affiche le badge "Mien" si isMine=true', () => {
    render(<CentreCardMobile centre={c} isMine isOpen />)
    expect(screen.getByText('Mien')).toBeInTheDocument()
  })

  it('appelle onClick quand on tape', () => {
    const fn = jest.fn()
    render(<CentreCardMobile centre={c} isOpen onClick={fn} />)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('respecte tap-min 44px (min-height inline)', () => {
    render(<CentreCardMobile centre={c} isOpen />)
    const root = screen.getByRole('button')
    expect(root.style.minHeight).toBe('44px')
  })
})
