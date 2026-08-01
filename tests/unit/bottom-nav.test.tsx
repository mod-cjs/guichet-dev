import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/components/ui/BottomNav'

jest.mock('next/navigation', () => ({
  usePathname: () => '/opportunites',
}))

describe('<BottomNav /> (signature v5 — GUIC-689)', () => {
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
    render(<BottomNav badges={{ '/jeune/mes-candidatures': 3 }} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('plafonne le badge à 9+', () => {
    render(<BottomNav badges={{ '/jeune/mes-candidatures': 42 }} />)
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

  it('est masquée à partir de md (≥ 768px) — md:hidden (GUIC-216)', () => {
    render(<BottomNav />)
    const nav = screen.getByRole('navigation', { name: /navigation/i })
    expect(nav.className).toContain('md:hidden')
  })

  // GUIC-689 (Lot E) — signature v5 : `design-guichet-v5/phone.jsx:181-185`.
  // « Mes candidatures » est un parcours central et n'était jusqu'ici présent
  // dans AUCUNE chrome persistante mobile. Le remplacement d'Agenda/Ressources
  // par Candidatures/Profil est une décision produit rendue par le lead.
  it('expose Accueil / Explorer / Candidatures / Centres CJS / Profil, dans cet ordre', () => {
    render(<BottomNav />)
    const links = screen.getAllByRole('link')
    expect(links.map(l => l.textContent)).toEqual([
      'Accueil',
      'Explorer',
      'Candidatures',
      'Centres CJS',
      'Profil',
    ])
  })

  it('l\'item Candidatures pointe vers /jeune/mes-candidatures (parcours introuvable au doigt avant GUIC-689)', () => {
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: /candidatures/i })).toHaveAttribute(
      'href',
      '/jeune/mes-candidatures',
    )
  })

  it('l\'item Centres CJS pointe vers /centres', () => {
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: /centres cjs/i })).toHaveAttribute('href', '/centres')
  })

  it('l\'item Profil pointe vers /jeune/mon-profil', () => {
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: /^profil$/i })).toHaveAttribute(
      'href',
      '/jeune/mon-profil',
    )
  })

  // Plancher typographique 11px (GUIC-689) — le badge compteur codait en dur
  // `text-[10px]`, sous le plancher `--fs-100` (11px) utilisé partout ailleurs
  // dans le composant.
  it('le badge compteur respecte le plancher 11px (text-fs-100, pas de text-[10px] en dur)', () => {
    render(<BottomNav badges={{ '/jeune/mes-candidatures': 3 }} />)
    const badge = screen.getByText('3')
    expect(badge.className).toContain('text-fs-100')
    expect(badge.className).not.toContain('text-[10px]')
  })
})
