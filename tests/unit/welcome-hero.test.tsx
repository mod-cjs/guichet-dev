/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { WelcomeHero } from '@/components/home/WelcomeHero'

describe('<WelcomeHero /> — homepage publique (GUIC-199)', () => {
  it('affiche les 3 stats CJS', () => {
    render(<WelcomeHero />)
    expect(screen.getByText('22 695')).toBeInTheDocument()
    expect(screen.getByText('1 240')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('CTA primaire "Créer mon profil" pointe vers /auth/connexion', () => {
    render(<WelcomeHero />)
    const cta = screen.getByRole('link', { name: /créer mon profil/i })
    expect(cta).toHaveAttribute('href', '/auth/connexion')
  })

  it('CTA secondaire "Voir les opportunités" pointe vers /opportunites', () => {
    render(<WelcomeHero />)
    const cta = screen.getByRole('link', { name: /voir les opportunités/i })
    expect(cta).toHaveAttribute('href', '/opportunites')
  })

  it('affiche l\'eyebrow marketing "Le guichet unique du CJS"', () => {
    render(<WelcomeHero />)
    expect(screen.getByText(/le guichet unique du cjs/i)).toBeInTheDocument()
  })

  it('affiche le titre principal', () => {
    render(<WelcomeHero />)
    expect(screen.getByRole('heading', { level: 1, name: /trouve ta prochaine opportunité/i })).toBeInTheDocument()
  })
})
