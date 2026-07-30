/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Vague 1 design v5 : hero d'accueil « impact immédiat »
 * (Reponse au retour design V3.html §3, refs web-onboarding.jsx /
 * onboarding.jsx).
 *
 * Contrat v5 :
 *  - Web : titre « Accédez aux opportunités d'emploi, de formation et de
 *    financement. », les trois piliers en jaune.
 *  - Mobile : « Emploi, formation, financement — au même endroit. »
 *  - UN SEUL bouton plein par écran : « Explorer les opportunités »
 *    (→ /opportunites, jaune — le magenta ne passe pas l'AA sur fond sombre).
 *    L'inscription passe en lien secondaire souligné (→ /auth/connexion).
 *  - Carte opp du hero web : type et urgence en DEUX pastilles distinctes
 *    (« Financement » + « J-3 »), jamais fusionnées.
 *  - Zéro hex en dur dans les composants du hero.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'

import { WelcomeHeroMobile } from '@/components/home/WelcomeHeroMobile'
import { WelcomeHeroWeb } from '@/components/home/WelcomeHeroWeb'

describe('<WelcomeHeroMobile /> — v5', () => {
  it('affiche les stats CJS', () => {
    render(<WelcomeHeroMobile />)
    expect(screen.getByText('22 695')).toBeInTheDocument()
    expect(screen.getByText('1 240')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('titre v5 : les trois piliers au même endroit', () => {
    render(<WelcomeHeroMobile />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Emploi, formation, financement — au même endroit.',
    )
  })

  it('UN SEUL bouton plein : « Explorer les opportunités » → /opportunites', () => {
    render(<WelcomeHeroMobile />)
    expect(screen.getByRole('link', { name: /explorer les opportunités/i })).toHaveAttribute(
      'href',
      '/opportunites',
    )
    // l'ancien couple « Créer mon profil » plein + « Voir les opportunités » outline a disparu
    expect(screen.queryByRole('link', { name: /créer mon profil/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /voir les opportunités/i })).not.toBeInTheDocument()
  })

  it('l’inscription est un lien secondaire → /auth/connexion', () => {
    render(<WelcomeHeroMobile />)
    expect(screen.getByRole('link', { name: /créer mon compte/i })).toHaveAttribute(
      'href',
      '/auth/connexion',
    )
  })
})

describe('<WelcomeHeroWeb /> — v5', () => {
  it('affiche les 4 stats CJS (incluant Centres)', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByText('22 695')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText(/centres cjs/i)).toBeInTheDocument()
  })

  it('titre v5 : nomme les trois piliers (emploi, formation, financement)', () => {
    render(<WelcomeHeroWeb />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/accédez aux opportunités/i)
    expect(h1).toHaveTextContent(/emploi/i)
    expect(h1).toHaveTextContent(/formation/i)
    expect(h1).toHaveTextContent(/financement/i)
  })

  it('UN SEUL bouton plein : « Explorer les opportunités » → /opportunites', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByRole('link', { name: /explorer les opportunités/i })).toHaveAttribute(
      'href',
      '/opportunites',
    )
    expect(screen.queryByRole('link', { name: /créer mon compte gratuit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /voir les opportunités/i })).not.toBeInTheDocument()
  })

  it('l’inscription est un lien secondaire → /auth/connexion', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByRole('link', { name: /créer mon compte/i })).toHaveAttribute(
      'href',
      '/auth/connexion',
    )
  })

  it('carte opp : type et urgence en deux pastilles distinctes, jamais fusionnées', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByText('Financement')).toBeInTheDocument()
    expect(screen.getByText('J-3')).toBeInTheDocument()
    expect(screen.queryByText(/urgent · j-3/i)).not.toBeInTheDocument()
  })

  it('wordmark Yaye : pastille IA présente', () => {
    render(<WelcomeHeroWeb />)
    expect(screen.getByTestId('yaye-wordmark')).toBeInTheDocument()
  })
})

describe('sentinelle hex — composants hero', () => {
  const ROOT = resolve(__dirname, '../..')

  it.each([
    'src/components/home/WelcomeHeroWeb.tsx',
    'src/components/home/WelcomeHeroMobile.tsx',
  ])('%s : zéro hex en dur (tokens gj-* uniquement)', (rel) => {
    const src = readFileSync(resolve(ROOT, rel), 'utf-8')
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
