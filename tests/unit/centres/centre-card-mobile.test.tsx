/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentreCardMobile } from '@/components/centres/CentreCardMobile'

const c = {
  id: 'c-dakar',
  slug: 'cjs-dakar',
  nom: 'CJS Dakar',
  region: 'Dakar',
  ville: 'Dakar',
  addr: '34 rue Mohamed V, Plateau',
}

describe('<CentreCardMobile />', () => {
  it('rend le nom + aria-label "Voir le centre {nom}"', () => {
    render(<CentreCardMobile centre={c} isOpen />)
    expect(screen.getByText('CJS Dakar')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Voir le centre CJS Dakar/i }),
    ).toBeInTheDocument()
  })

  it('rend un pin SVG 42×42 à gauche', () => {
    const { container } = render(<CentreCardMobile centre={c} isOpen />)
    const pin = container.querySelector('span[aria-hidden="true"]') as HTMLElement | null
    expect(pin).toBeTruthy()
    expect(pin!.style.width).toBe('42px')
    expect(pin!.style.height).toBe('42px')
  })

  it('affiche l\'adresse complète sous le nom si fournie', () => {
    render(<CentreCardMobile centre={c} isOpen />)
    expect(screen.getByText('34 rue Mohamed V, Plateau')).toBeInTheDocument()
  })

  it('n\'affiche pas de ligne adresse si addr absent', () => {
    const sansAddr = { ...c, addr: undefined }
    render(<CentreCardMobile centre={sansAddr} isOpen />)
    expect(screen.queryByText('34 rue Mohamed V, Plateau')).not.toBeInTheDocument()
  })

  it('affiche le badge "Mien" si isMine=true', () => {
    render(<CentreCardMobile centre={c} isMine isOpen />)
    expect(screen.getByText('Mien')).toBeInTheDocument()
  })

  it('affiche le km si fourni', () => {
    render(<CentreCardMobile centre={{ ...c, km: 0.5 }} isOpen />)
    expect(screen.getByText('0.5 km')).toBeInTheDocument()
  })

  it('n\'affiche pas le km si undefined', () => {
    render(<CentreCardMobile centre={c} isOpen />)
    expect(screen.queryByText(/\bkm\b/)).not.toBeInTheDocument()
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
