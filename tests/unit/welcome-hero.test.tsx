/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { WelcomeHeroMobile } from '@/components/home/WelcomeHeroMobile'
import { WelcomeHeroWeb } from '@/components/home/WelcomeHeroWeb'

describe('<WelcomeHeroMobile />', () => {
  it('affiche les stats CJS', () => {
    render(<WelcomeHeroMobile />)
    expect(screen.getByText('22 695')).toBeInTheDocument()
    expect(screen.getByText('1 240')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('CTA primaire pointe vers /auth/connexion', () => {
    render(<WelcomeHeroMobile />)
    expect(screen.getByRole('link', { name: /créer mon profil/i })).toHaveAttribute(
      'href',
      '/auth/connexion',
    )
  })

  it('CTA secondaire pointe vers /opportunites', () => {
    render(<WelcomeHeroMobile />)
    expect(screen.getByRole('link', { name: /voir les opportunités/i })).toHaveAttribute(
      'href',
      '/opportunites',
    )
  })
})

describe('<WelcomeHeroWeb />', () => {
  it('affiche les 4 stats CJS (incluant Centres)', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByText('22 695')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText(/centres cjs/i)).toBeInTheDocument()
  })

  it('CTA primaire "Créer mon compte gratuit" pointe vers /auth/connexion', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByRole('link', { name: /créer mon compte gratuit/i })).toHaveAttribute(
      'href',
      '/auth/connexion',
    )
  })

  it('CTA secondaire pointe vers /opportunites', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByRole('link', { name: /voir les opportunités/i })).toHaveAttribute(
      'href',
      '/opportunites',
    )
  })

  it('affiche le titre "Ton avenir, commence ici."', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ton avenir/i)
  })
})
