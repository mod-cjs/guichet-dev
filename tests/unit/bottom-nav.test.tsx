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

  it('est masquée à partir de md (≥ 768px) — md:hidden', () => {
    render(<BottomNav />)
    const nav = screen.getByRole('navigation', { name: /navigation/i })
    expect(nav.className).toContain('md:hidden')
  })

  it('porte la classe .gj-bottom-nav (sélecteur CSS body:has)', () => {
    render(<BottomNav />)
    const nav = screen.getByRole('navigation', { name: /navigation/i })
    expect(nav.classList.contains('gj-bottom-nav')).toBe(true)
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
})
