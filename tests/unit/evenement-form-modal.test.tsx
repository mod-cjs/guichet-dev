import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/app/admin/evenements/actions', () => ({
  creerEvenement: jest.fn().mockResolvedValue({ id: 'e-new' }),
  modifierEvenement: jest.fn().mockResolvedValue({ ok: true }),
}))

import { EvenementFormModal } from '@/app/admin/evenements/EvenementFormModal'
import { creerEvenement } from '@/app/admin/evenements/actions'

const CENTRES = [{ id: 'c1', nom: 'Dakar Plateau' }, { id: 'c2', nom: 'Guédiawaye' }]

describe('GUIC-474 — EvenementFormModal (cours au centre)', () => {
  it('propose le type « Cours » et un sélecteur de centre', () => {
    render(<EvenementFormModal isOpen onClose={() => {}} centres={CENTRES} />)
    expect(screen.getByRole('option', { name: 'Cours' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Centre \(cours\/session/)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Guédiawaye' })).toBeInTheDocument()
  })

  it('création : transmet type Cours + centreId à creerEvenement', async () => {
    const user = userEvent.setup()
    render(<EvenementFormModal isOpen onClose={() => {}} centres={CENTRES} />)
    await user.type(screen.getByLabelText(/^Titre/), 'Préparation BAC')
    await user.type(screen.getByLabelText(/^Description/), 'Cours de maths')
    await user.selectOptions(screen.getByLabelText(/^Type/), 'Cours')
    await user.type(screen.getByLabelText(/Date de début/), '2026-07-10T09:00')
    await user.type(screen.getByLabelText(/^Lieu/), 'Salle 2')
    await user.selectOptions(screen.getByLabelText(/Centre \(cours\/session/), 'c2')
    await user.click(screen.getByRole('button', { name: /Créer/ }))

    expect(creerEvenement).toHaveBeenCalledTimes(1)
    const arg = (creerEvenement as jest.Mock).mock.calls[0][0]
    expect(arg.type).toBe('Cours')
    expect(arg.centreId).toBe('c2')
  })
})
