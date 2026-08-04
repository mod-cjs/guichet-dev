/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Vague 1 design v5 : header marketing public.
 *
 * Réf web-onboarding.jsx:200-201 + Reponse au retour design V3 §3 :
 * « Se connecter » redevient un lien texte discret ; « Créer mon compte »
 * apparaît en bouton CONTOUR (desktop) — plus de bouton plein teal dans
 * l'en-tête (une seule action pleine par écran, et elle est dans le hero).
 */
import { render, screen } from '@testing-library/react'

import { Header } from '@/components/layout/Header'

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(async () => null),
}))

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('<Header /> marketing — anonyme (v5)', () => {
  it('« Se connecter » est un lien texte (plus un bouton plein teal)', async () => {
    render(await Header())
    const login = screen.getByRole('link', { name: /se connecter/i })
    expect(login).toHaveAttribute('href', '/auth/connexion')
    expect(login.className).not.toMatch(/bg-gj-teal/)
  })

  it('« Créer mon compte » est présent en bouton contour → /auth/connexion', async () => {
    render(await Header())
    const signup = screen.getByRole('link', { name: /créer mon compte/i })
    expect(signup).toHaveAttribute('href', '/auth/connexion')
    expect(signup.className).toMatch(/border/)
  })
})
