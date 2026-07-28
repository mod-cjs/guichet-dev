/**
 * GUIC-684 — `ProgrammesField` (admin), partagé par les 3 formulaires.
 *
 * Le modèle est M:N par anticipation, mais le cas courant reste « un seul
 * programme » : ces tests verrouillent le fait que ce cas coûte UN clic et
 * n'expose aucun choix supplémentaire.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProgrammesField } from '@/components/admin/ProgrammesField'

const OPTIONS = [
  { slug: 'yaakaar', nom: 'Yaakaar' },
  { slug: 'yeah', nom: 'YEAH' },
  { slug: 'edupop', nom: 'EduPop' },
]

describe('ProgrammesField', () => {
  it('propose les programmes actifs et marque les sélectionnés', () => {
    render(<ProgrammesField options={OPTIONS} value={['yeah']} onChange={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'YEAH' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Yaakaar' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('ajoute puis retire un programme au clic', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      <ProgrammesField options={OPTIONS} value={[]} onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'YEAH' }))
    expect(onChange).toHaveBeenCalledWith(['yeah'])

    rerender(<ProgrammesField options={OPTIONS} value={['yeah']} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'YEAH' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('n’expose PAS le choix du principal avec un seul programme', () => {
    render(
      <ProgrammesField
        options={OPTIONS}
        value={['yeah']}
        onChange={jest.fn()}
        onPrincipalChange={jest.fn()}
      />,
    )
    expect(screen.queryByRole('group', { name: 'Programme principal' })).not.toBeInTheDocument()
  })

  it('expose le choix du principal dès 2 programmes', async () => {
    const onPrincipalChange = jest.fn()
    const user = userEvent.setup()
    render(
      <ProgrammesField
        options={OPTIONS}
        value={['yeah', 'edupop']}
        onChange={jest.fn()}
        onPrincipalChange={onPrincipalChange}
      />,
    )

    const groupe = screen.getByRole('group', { name: 'Programme principal' })
    // Par défaut, le premier sélectionné est principal.
    expect(within(groupe).getByRole('button', { name: 'YEAH' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(groupe).getByRole('button', { name: 'EduPop' }))
    expect(onPrincipalChange).toHaveBeenCalledWith('edupop')
  })

  it('affiche l’erreur de validation', () => {
    render(
      <ProgrammesField
        options={OPTIONS}
        value={[]}
        onChange={jest.fn()}
        error="Sélectionne au moins un programme."
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Sélectionne au moins un programme.')
  })
})
