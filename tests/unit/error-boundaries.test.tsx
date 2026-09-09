/**
 * @jest-environment jsdom
 *
 * GUIC-689 (Lot D2) : frontières d'erreur de segment (`error.tsx`).
 * - composant client, props `{ error, reset }`
 * - état plein écran (D3) + bouton "Réessayer" branché sur `reset()`
 * - lien de repli vers l'accueil de l'espace
 * - ne divulgue jamais le message d'erreur brut
 */
import { render, screen } from '@testing-library/react'
import JeuneError from '@/app/jeune/error'
import PublicError from '@/app/(public)/error'
import RecruteurError from '@/app/recruteur/error'
import ConseillerError from '@/app/conseiller/error'

const SECRET = 'ECONNREFUSED 127.0.0.1:3306 — mot de passe invalide'

function mkError() {
  return Object.assign(new Error(SECRET), { digest: 'abc123' })
}

describe.each([
  ['jeune', JeuneError, '/jeune/tableau-de-bord'],
  ['public', PublicError, '/'],
  ['recruteur', RecruteurError, '/recruteur/tableau-de-bord'],
  ['conseiller', ConseillerError, '/conseiller'],
] as const)('error.tsx — espace %s (GUIC-689)', (_label, ErrorComponent, homeHref) => {
  it('ne divulgue jamais le message d\'erreur brut', () => {
    const reset = jest.fn()
    render(<ErrorComponent error={mkError()} reset={reset} />)
    expect(document.body.textContent).not.toContain(SECRET)
  })

  it('affiche un bouton "Réessayer" branché sur reset()', () => {
    const reset = jest.fn()
    render(<ErrorComponent error={mkError()} reset={reset} />)
    screen.getByRole('button', { name: 'Réessayer' }).click()
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("affiche un lien de repli vers l'accueil de l'espace", () => {
    render(<ErrorComponent error={mkError()} reset={jest.fn()} />)
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === homeHref)).toBe(true)
  })
})
