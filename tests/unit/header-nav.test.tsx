import { render, screen } from '@testing-library/react'
import { HeaderNav } from '@/components/layout/Header/HeaderNav'
import { LIENS_PUBLICS, LIENS_CONNECTE } from '@/components/layout/Header/nav-liens'

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('<HeaderNav />', () => {
  it('rend les liens publics internes', () => {
    render(<HeaderNav isAuthenticated={false} liensPublics={LIENS_PUBLICS} liensConnecte={LIENS_CONNECTE} />)
    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Opportunités' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Agenda' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ressources' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Centres CJS' })).toBeInTheDocument()
  })

  it('rend les liens externes YEAH et E-learning avec target=_blank', () => {
    render(<HeaderNav isAuthenticated={false} liensPublics={LIENS_PUBLICS} liensConnecte={LIENS_CONNECTE} />)
    const yeah = screen.getByRole('link', { name: /YEAH \(ouvre dans un nouvel onglet\)/i })
    expect(yeah).toHaveAttribute('target', '_blank')
    expect(yeah).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(yeah).toHaveAttribute('href', 'https://yeah.consortiumjeunessesenegal.org')

    const elearning = screen.getByRole('link', { name: /E-learning \(ouvre dans un nouvel onglet\)/i })
    expect(elearning).toHaveAttribute('target', '_blank')
    expect(elearning).toHaveAttribute('href', 'https://elearning.guichetjeunesse.sn')
  })

  it('rend les liens authentifiés quand isAuthenticated=true', () => {
    render(<HeaderNav isAuthenticated liensPublics={LIENS_PUBLICS} liensConnecte={LIENS_CONNECTE} />)
    expect(screen.getByRole('link', { name: 'Mon dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mon profil' })).toBeInTheDocument()
  })

  it('omet les liens authentifiés quand isAuthenticated=false', () => {
    render(<HeaderNav isAuthenticated={false} liensPublics={LIENS_PUBLICS} liensConnecte={LIENS_CONNECTE} />)
    expect(screen.queryByRole('link', { name: 'Mon dashboard' })).not.toBeInTheDocument()
  })
})
