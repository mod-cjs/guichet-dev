import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/app/admin/evenements/actions', () => ({
  creerEvenement: jest.fn().mockResolvedValue({ id: 'e-new' }),
  modifierEvenement: jest.fn().mockResolvedValue({ ok: true }),
}))

// Éditeur riche (Tiptap) remplacé par un textarea léger : lourd à monter en jsdom,
// couvert par ses propres tests. On teste ici la logique du modal.
jest.mock('@/components/ui/RichTextEditor', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RichTextEditor: ({ label, name, value, onChange }: any) => (
    <textarea aria-label={label} name={name} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} />
  ),
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
    // delay: null → pas de setTimeout entre frappes ; évite que le remplissage du
    // formulaire soit affamé en CPU sous forte parallélisation (submit non déclenché).
    const user = userEvent.setup({ delay: null })
    render(<EvenementFormModal isOpen onClose={() => {}} centres={CENTRES} />)
    await user.type(screen.getByLabelText(/^Titre/), 'Préparation BAC')
    // La description est un éditeur riche (Tiptap) — non simulable en jsdom ;
    // ce test vérifie le passage de type + centreId, pas le corps riche.
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
