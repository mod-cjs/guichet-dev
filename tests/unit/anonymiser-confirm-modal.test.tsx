/**
 * GUIC-701 (PR-C) — AnonymiserConfirmModal : effacement irréversible (droit à l'effacement).
 * Double confirmation : saisir « ANONYMISER » + cocher « j'ai compris ». TDD — RED.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockAnon = jest.fn().mockResolvedValue({ ok: true })
jest.mock('@/app/admin/utilisateurs/actions', () => ({ anonymiserUtilisateur: (...a: unknown[]) => mockAnon(...a) }))

import { AnonymiserConfirmModal } from '@/app/admin/utilisateurs/AnonymiserConfirmModal'

beforeEach(() => mockAnon.mockClear())

describe('GUIC-701 — AnonymiserConfirmModal', () => {
  it('bouton confirmer désactivé tant que la double confirmation n’est pas complète', () => {
    render(<AnonymiserConfirmModal cjsUid="u1" nom="Awa Diop" onClose={() => {}} />)
    const btn = screen.getByRole('button', { name: /Anonymiser définitivement/i })
    expect(btn).toBeDisabled()
    // seulement la saisie → toujours désactivé
    fireEvent.change(screen.getByLabelText(/Tapez ANONYMISER/i), { target: { value: 'ANONYMISER' } })
    expect(btn).toBeDisabled()
    // + la case cochée → activé
    fireEvent.click(screen.getByLabelText(/j'ai compris/i))
    expect(btn).toBeEnabled()
  })

  it('confirme → appelle anonymiserUtilisateur(cjsUid)', async () => {
    render(<AnonymiserConfirmModal cjsUid="u1" nom="Awa Diop" onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText(/Tapez ANONYMISER/i), { target: { value: 'ANONYMISER' } })
    fireEvent.click(screen.getByLabelText(/j'ai compris/i))
    fireEvent.click(screen.getByRole('button', { name: /Anonymiser définitivement/i }))
    await waitFor(() => expect(mockAnon).toHaveBeenCalledWith('u1'))
  })

  it('mentionne l’irréversibilité', () => {
    render(<AnonymiserConfirmModal cjsUid="u1" nom="Awa Diop" onClose={() => {}} />)
    expect(screen.getByText(/irréversible/i)).toBeInTheDocument()
  })
})
