/** @jest-environment jsdom */
/**
 * GUIC-522 F-13 — les pages `force-dynamic` de la bibliothèque admin (overview + gestion)
 * n'avaient aucune frontière d'erreur : une panne DB remontait un 500 brut. `error.tsx`
 * capture l'erreur, affiche un message cadré et propose de réessayer (`reset`).
 */
import { render, screen, fireEvent } from '@testing-library/react'
import BibliothequeError from '@/app/admin/bibliotheque/error'
import BibliothequeGestionError from '@/app/admin/bibliotheque/gestion/error'

function err(): Error & { digest?: string } {
  return Object.assign(new Error('DB indisponible'), { digest: 'abc123' })
}

describe.each([
  ['overview /admin/bibliotheque', BibliothequeError],
  ['gestion /admin/bibliotheque/gestion', BibliothequeGestionError],
])('%s — error.tsx (F-13)', (_label, Comp) => {
  it('affiche un message cadré (pas la stack technique brute)', () => {
    const reset = jest.fn()
    render(<Comp error={err()} reset={reset} />)
    expect(screen.getByText(/erreur est survenue/i)).toBeInTheDocument()
    expect(screen.queryByText(/DB indisponible/)).not.toBeInTheDocument()
  })

  it('propose un bouton Réessayer qui appelle reset()', () => {
    const reset = jest.fn()
    render(<Comp error={err()} reset={reset} />)
    const btn = screen.getByRole('button', { name: /réessayer/i })
    fireEvent.click(btn)
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
