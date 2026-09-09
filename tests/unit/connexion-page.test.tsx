/**
 * GUIC-689 — Tests d'intégration de la page /auth/connexion.
 *
 * Couvre :
 *  1. Le CTA SSO « Continuer avec mon compte CJS » porte bg-gj-teal-deep
 *     (une connexion n'est jamais un CTA de conversion magenta).
 *  2. Le bandeau d'erreur porte les tokens sémantiques gj-red-soft/-ink.
 *  3. Le check des avantages est rendu via le sprite <Icon name="check" />.
 */
import { render, screen } from '@testing-library/react'
import ConnexionPage from '@/app/auth/connexion/page'

describe('/auth/connexion', () => {
  it('le CTA SSO porte bg-gj-teal-deep + hover bg-gj-teal-deep-2', async () => {
    const ui = await ConnexionPage({ searchParams: Promise.resolve({}) })
    render(ui)
    const cta = screen.getByRole('link', { name: /Continuer avec mon compte CJS/i })
    expect(cta.className).toMatch(/\bbg-gj-teal-deep\b/)
    expect(cta.className).toMatch(/hover:bg-gj-teal-deep-2\b/)
    expect(cta.className).not.toMatch(/\bbg-gj-teal\b(?!-deep)/)
  })

  it('rend le check des avantages via le sprite Icon (pas de svg inline manuel)', async () => {
    const ui = await ConnexionPage({ searchParams: Promise.resolve({}) })
    const { container } = render(ui)
    const use = container.querySelector('svg use[href="/icons.svg#i-check"]')
    expect(use).not.toBeNull()
  })

  it("le bandeau d'erreur porte bg-gj-red-soft/text-gj-red-ink (pas bg-red-50)", async () => {
    const ui = await ConnexionPage({ searchParams: Promise.resolve({ error: 'auth_failed' }) })
    render(ui)
    const alert = screen.getByRole('alert')
    expect(alert.className).toMatch(/bg-gj-red-soft/)
    expect(alert.className).toMatch(/text-gj-red-ink/)
    expect(alert.className).not.toMatch(/bg-red-50/)
    expect(alert.className).not.toMatch(/gj-red\/30/)
  })
})

/**
 * GUIC-689 — l'écran de connexion doit transmettre la destination de retour.
 *
 * Sans ça, un jeune qui clique « Ajouter aux favoris » sur une ressource
 * atterrit après connexion sur son tableau de bord, sans favori et sans la
 * ressource sous les yeux. La validation reste côté serveur (`safeReturnTo`) :
 * cette page ne fait que porter le paramètre.
 */
describe('GUIC-689 — transmission de la destination de retour', () => {
  const lienSso = (html: HTMLElement) =>
    html.querySelector('a[href^="/api/auth/login"]') as HTMLAnchorElement | null

  it('given ?next=, then le lien SSO porte la destination', async () => {
    const ui = await ConnexionPage({
      searchParams: Promise.resolve({ next: '/ressources?vue=liste' }),
    })
    const { container } = render(ui)
    expect(lienSso(container)?.getAttribute('href')).toBe(
      '/api/auth/login?next=%2Fressources%3Fvue%3Dliste',
    )
  })

  it('given aucun ?next=, then le lien SSO reste nu', async () => {
    const ui = await ConnexionPage({ searchParams: Promise.resolve({}) })
    const { container } = render(ui)
    expect(lienSso(container)?.getAttribute('href')).toBe('/api/auth/login')
  })
})
