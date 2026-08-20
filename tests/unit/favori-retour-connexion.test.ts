/**
 * @jest-environment node
 *
 * GUIC-689 — Cliquer « Ajouter aux favoris » sans être connecté ne doit pas
 * détruire le contexte.
 *
 * Reproduit au rendu : anonyme sur /ressources?vue=liste, 8 boutons favori
 * proposés ; le clic renvoie 401 puis redirige en dur vers /auth/connexion
 * SANS URL de retour. Après connexion on atterrit sur le tableau de bord, la
 * ressource n'est pas en favori, et on recommence.
 *
 * Le mécanisme de retour existe pourtant déjà : le callback SSO lit le cookie
 * `auth_return_to` et le valide par `safeReturnTo` (GUIC-241). Le middleware
 * l'alimente pour les pages protégées, `/api/whatsapp/link` pour son flux.
 * Personne ne l'alimente depuis l'écran de connexion.
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/sso-client', () => ({
  getAuthorizationUrl: jest.fn().mockResolvedValue({
    url: 'https://sso.example.org/authorize?x=1',
    state: 'st',
    pkceVerifier: 'pk',
  }),
}))

import { GET } from '@/app/api/auth/login/route'

const appeler = (url: string) => GET(new NextRequest(url))

describe('GUIC-689 — /api/auth/login mémorise la destination de retour', () => {
  it('given ?next= interne, then pose le cookie auth_return_to', async () => {
    const res = await appeler('http://localhost/api/auth/login?next=%2Fressources%3Fvue%3Dliste')
    expect(res.cookies.get('auth_return_to')?.value).toBe('/ressources?vue=liste')
  })

  it('given aucun ?next=, then ne pose aucun cookie de retour', async () => {
    const res = await appeler('http://localhost/api/auth/login')
    expect(res.cookies.get('auth_return_to')?.value).toBeUndefined()
  })

  it('given ?next= protocol-relative, then refuse (open redirect)', async () => {
    const res = await appeler('http://localhost/api/auth/login?next=%2F%2Fevil.com')
    expect(res.cookies.get('auth_return_to')?.value).toBeUndefined()
  })

  it('given ?next= absolu externe, then refuse', async () => {
    const res = await appeler('http://localhost/api/auth/login?next=https%3A%2F%2Fevil.com%2Fx')
    expect(res.cookies.get('auth_return_to')?.value).toBeUndefined()
  })

  it('le cookie de retour est httpOnly et expire avec le flux OAuth', async () => {
    const res = await appeler('http://localhost/api/auth/login?next=%2Fressources')
    const c = res.cookies.get('auth_return_to')
    expect(c?.httpOnly).toBe(true)
    expect(c?.maxAge).toBe(300)
  })
})
