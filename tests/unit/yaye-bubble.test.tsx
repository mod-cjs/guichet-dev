import { render, screen } from '@testing-library/react'
import { YayeBubble } from '@/components/ui/Yaye/YayeBubble'

describe('<YayeBubble />', () => {
  it('rend le contenu', () => {
    render(<YayeBubble from="bot">Hello</YayeBubble>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('aligne à gauche pour bot', () => {
    const { container } = render(<YayeBubble from="bot">x</YayeBubble>)
    expect((container.firstChild as HTMLElement).className).toMatch(/items-start/)
  })

  it('aligne à droite pour user', () => {
    const { container } = render(<YayeBubble from="user">x</YayeBubble>)
    expect((container.firstChild as HTMLElement).className).toMatch(/items-end/)
  })

  it('applique des classes différentes selon from', () => {
    const { container: bot } = render(<YayeBubble from="bot">a</YayeBubble>)
    const { container: user } = render(<YayeBubble from="user">a</YayeBubble>)
    const botInner = bot.firstChild?.firstChild as HTMLElement
    const userInner = user.firstChild?.firstChild as HTMLElement
    expect(botInner.className).toMatch(/bg-white/)
    expect(userInner.className).toMatch(/bg-gj-teal-deep/)
    expect(userInner.className).toMatch(/text-white/)
  })

  it('affiche le timestamp quand fourni', () => {
    render(<YayeBubble from="bot" timestamp="9:41">x</YayeBubble>)
    expect(screen.getByText('9:41')).toBeInTheDocument()
  })
})
