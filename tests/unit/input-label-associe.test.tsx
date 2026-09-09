/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Le libellé de `<Input>` doit être ASSOCIÉ à son champ.
 *
 * Défaut constaté en écrivant la saisie des engagements : la primitive rend
 * `<label htmlFor={id}>` sans jamais générer d'`id`. Sans prop explicite,
 * `htmlFor` vaut `undefined` : le libellé ne pointe sur rien, le champ n'a
 * aucun nom accessible, et un lecteur d'écran annonce « zone de saisie » sans
 * dire laquelle.
 *
 * Le défaut est SILENCIEUX à l'œil — le texte s'affiche à côté du champ, tout
 * semble normal.
 */
import { render, screen } from '@testing-library/react'
import { Input } from '@/components/ui/Input'

describe('GUIC-689 — association libellé / champ', () => {
  it('associe le libellé même sans `id` fourni', () => {
    render(<Input label="Rôle" />)
    expect(screen.getByRole('textbox', { name: 'Rôle' })).toBeInTheDocument()
  })

  it('respecte un `id` explicite quand il est fourni', () => {
    render(<Input id="mon-champ" label="Organisation" />)
    const champ = screen.getByRole('textbox', { name: 'Organisation' })
    expect(champ).toHaveAttribute('id', 'mon-champ')
  })

  it('deux champs sans `id` ne se volent pas leur libellé', () => {
    render(
      <>
        <Input label="Début" />
        <Input label="Fin" />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Début' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Fin' })).toBeInTheDocument()
  })
})
