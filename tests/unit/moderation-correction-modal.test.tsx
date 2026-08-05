/**
 * GUIC-702 · PR-C (RED) — modale « Demander correction ».
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CorrectionModal } from '@/app/admin/opportunites/CorrectionModal'

const mockDemander = jest.fn()
jest.mock('@/app/admin/opportunites/actions', () => ({
  demanderCorrection: (...a: unknown[]) => mockDemander(...a),
}))

beforeEach(() => mockDemander.mockReset())

function renderModal() {
  return render(
    <CorrectionModal isOpen onClose={jest.fn()} offreId="o1" offreTitre="Agent commercial" onDone={jest.fn()} />,
  )
}

describe('GUIC-702 — CorrectionModal', () => {
  it('le bouton d’envoi est désactivé tant que le message est vide', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /Envoyer au recruteur/i })).toBeDisabled()
  })

  it('envoie le message via demanderCorrection', async () => {
    mockDemander.mockResolvedValue({ ok: true })
    renderModal()
    fireEvent.change(screen.getByLabelText('Message de correction'), {
      target: { value: 'Retirer les frais d’inscription.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Envoyer au recruteur/i }))
    await waitFor(() => expect(mockDemander).toHaveBeenCalledWith('o1', 'Retirer les frais d’inscription.'))
  })
})
