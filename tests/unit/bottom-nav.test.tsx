import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/components/ui/BottomNav'

jest.mock('next/navigation', () => ({
  usePathname: () => '/opportunites',
}))

describe('<BottomNav /> (ui v2)', () => {
  it('rend 5 items de navigation', () => {
    const { container } = render(<BottomNav />)
    expect(container.querySelectorAll('a')).toHaveLength(5)
  })

  it('ne contient aucun emoji nav (règle CLAUDE.md)', () => {
    const { container } = render(<BottomNav />)
    // Les emojis interdits historiques utilisés dans la version précédente.
    const forbidden = ['🏠', '🔍', '📅', '📚', '👤']
    const text = container.textContent || ''
    forbidden.forEach(emoji => expect(text).not.toContain(emoji))
  })

  it('chaque item rend un <svg> (Icon sprite)', () => {
    const { container } = render(<BottomNav />)
    const links = container.querySelectorAll('a')
    links.forEach(link => {
      expect(link.querySelector('svg')).toBeTruthy()
    })
  })

  it('marque l\'item actif via aria-current="page"', () => {
    render(<BottomNav />)
    const active = screen.getByRole('link', { current: 'page' })
    expect(active).toHaveAttribute('href', '/opportunites')
  })

  it('affiche un badge sur l\'item demandé', () => {
    render(<BottomNav badges={{ '/agenda': 3 }} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('plafonne le badge à 9+', () => {
    render(<BottomNav badges={{ '/agenda': 42 }} />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('a un aria-label de navigation', () => {
    render(<BottomNav />)
    expect(screen.getByRole('navigation', { name: /navigation/i })).toBeInTheDocument()
  })

  // GUIC-201 — la classe gj-bottom-nav est nécessaire pour que le sélecteur
  // global `body:has(.gj-bottom-nav)` (globals.css) applique le padding-bottom
  // qui empêche le dernier item de contenu d'être masqué par la nav fixed.
  it('porte la classe gj-bottom-nav (sélecteur globals.css)', () => {
    render(<BottomNav />)
    expect(screen.getByRole('navigation')).toHaveClass('gj-bottom-nav')
  })

  it('ne contient plus l\'item Profil (déplacé dans AppTopbar mobile)', () => {
    render(<BottomNav />)
    expect(screen.queryByRole('link', { name: /profil/i })).not.toBeInTheDocument()
  })

  it('expose l\'item Centres (remplace Profil — GUIC-205)', () => {
    render(<BottomNav />)
    const centres = screen.getByRole('link', { name: /centres/i })
    expect(centres).toHaveAttribute('href', '/centres')
  })

  it('est cachée en desktop (≥lg) via classe Tailwind lg:hidden', () => {
    const { container } = render(<BottomNav />)
    const nav = container.querySelector('nav')
    expect(nav?.className).toMatch(/\blg:hidden\b/)
  })
})
